from __future__ import annotations

import argparse
import csv
import json
import math
from bisect import bisect_left
from collections import defaultdict
from pathlib import Path
from statistics import mean, median
from typing import Any, Iterable


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _to_float(value: Any) -> float | None:
    if _is_number(value):
        return float(value)
    return None


def _safe_mean(values: Iterable[float]) -> float | None:
    materialized = list(values)
    if not materialized:
        return None
    return mean(materialized)


def _safe_median(values: Iterable[float]) -> float | None:
    materialized = list(values)
    if not materialized:
        return None
    return median(materialized)


def _safe_stdev(values: list[float]) -> float | None:
    if len(values) <= 1:
        return 0.0
    avg = mean(values)
    variance = sum((value - avg) ** 2 for value in values) / len(values)
    return math.sqrt(variance)


def _quantile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    if len(values) == 1:
        return values[0]
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) != len(ys) or len(xs) <= 1:
        return None
    x_avg = mean(xs)
    y_avg = mean(ys)
    numerator = sum((x - x_avg) * (y - y_avg) for x, y in zip(xs, ys, strict=True))
    x_var = sum((x - x_avg) ** 2 for x in xs)
    y_var = sum((y - y_avg) ** 2 for y in ys)
    denominator = math.sqrt(x_var * y_var)
    if denominator <= 0:
        return None
    return numerator / denominator


def _rank(values: list[float]) -> list[float]:
    ordered = sorted((value, index) for index, value in enumerate(values))
    ranks = [0.0] * len(values)
    cursor = 0
    while cursor < len(ordered):
        end = cursor
        while end + 1 < len(ordered) and ordered[end + 1][0] == ordered[cursor][0]:
            end += 1
        avg_rank = (cursor + end + 2) / 2
        for position in range(cursor, end + 1):
            ranks[ordered[position][1]] = avg_rank
        cursor = end + 1
    return ranks


def _spearman(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) != len(ys) or len(xs) <= 1:
        return None
    return _pearson(_rank(xs), _rank(ys))


def _weighted_average(pairs: list[tuple[float | None, float]]) -> float | None:
    numerator = 0.0
    denominator = 0.0
    for value, weight in pairs:
        if value is None or not math.isfinite(value) or weight <= 0:
            continue
        numerator += value * weight
        denominator += weight
    if denominator <= 0:
        return None
    return numerator / denominator


def _format_number(value: float | None, digits: int = 6) -> str:
    if value is None:
        return "n/a"
    return f"{value:.{digits}f}"


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        path.write_text("", encoding="utf8")
        return

    headers: list[str] = []
    seen = set()
    for row in rows:
        for key in row:
            if key not in seen:
                headers.append(key)
                seen.add(key)

    with path.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf8")


def _load_json_or_jsonl(path: Path) -> dict[str, Any]:
    if path.suffix == ".jsonl":
        return {
            "lines": [
                json.loads(line)
                for line in path.read_text(encoding="utf8").splitlines()
                if line.strip()
            ]
        }
    return json.loads(path.read_text(encoding="utf8"))


def _load_dataset_midpoints(dataset_path: Path) -> dict[tuple[str, str], dict[str, list[float]]]:
    raw = _load_json_or_jsonl(dataset_path)
    snapshots: list[dict[str, Any]] = []

    if "lines" in raw:
        for line in raw["lines"]:
            if isinstance(line, dict) and line.get("type") == "snapshot" and isinstance(line.get("snapshot"), dict):
                snapshots.append(line["snapshot"])
            elif isinstance(line, dict) and all(key in line for key in ("marketId", "outcomeTokenId", "ts", "bids", "asks")):
                snapshots.append(line)
        return _midpoint_index(snapshots)

    if isinstance(raw, dict) and isinstance(raw.get("snapshots"), list):
        snapshots.extend(item for item in raw["snapshots"] if isinstance(item, dict))
    elif isinstance(raw, dict) and isinstance(raw.get("events"), list):
        for event in raw["events"]:
            if isinstance(event, dict) and isinstance(event.get("snapshot"), dict):
                snapshots.append(event["snapshot"])

    return _midpoint_index(snapshots)


def _midpoint(snapshot: dict[str, Any]) -> float | None:
    bids = snapshot.get("bids")
    asks = snapshot.get("asks")
    if not isinstance(bids, list) or not isinstance(asks, list) or not bids or not asks:
        return None
    bid = _to_float(bids[0].get("price") if isinstance(bids[0], dict) else None)
    ask = _to_float(asks[0].get("price") if isinstance(asks[0], dict) else None)
    if bid is None or ask is None:
        return None
    return (bid + ask) / 2


def _midpoint_index(snapshots: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, list[float]]]:
    grouped: dict[tuple[str, str], list[tuple[int, float]]] = defaultdict(list)
    for snapshot in snapshots:
        market_id = snapshot.get("marketId")
        outcome_token_id = snapshot.get("outcomeTokenId")
        ts = snapshot.get("ts")
        midpoint = _midpoint(snapshot)
        if not isinstance(market_id, str) or not isinstance(outcome_token_id, str) or not isinstance(ts, int):
            continue
        if midpoint is None:
            continue
        grouped[(market_id, outcome_token_id)].append((ts, midpoint))

    index: dict[tuple[str, str], dict[str, list[float]]] = {}
    for key, rows in grouped.items():
        rows.sort(key=lambda item: item[0])
        index[key] = {
            "ts": [float(item[0]) for item in rows],
            "midpoint": [item[1] for item in rows],
        }
    return index


def _future_midpoint(
    midpoint_index: dict[tuple[str, str], dict[str, list[float]]],
    market_id: str,
    outcome_token_id: str,
    ts: int,
    horizon_ms: int,
) -> float | None:
    series = midpoint_index.get((market_id, outcome_token_id))
    if not series:
        return None
    target = float(ts + horizon_ms)
    position = bisect_left(series["ts"], target)
    while position < len(series["ts"]):
        midpoint = series["midpoint"][position]
        if math.isfinite(midpoint):
            return midpoint
        position += 1
    return None


def _decision_key(record: dict[str, Any]) -> tuple[str, str, int] | None:
    market_id = record.get("marketId")
    outcome_token_id = record.get("outcomeTokenId")
    ts = record.get("ts")
    if isinstance(market_id, str) and isinstance(outcome_token_id, str) and isinstance(ts, int):
        return market_id, outcome_token_id, ts
    return None


def _parse_decision_ts(client_order_id: str) -> int | None:
    if not client_order_id.startswith("bt-"):
        return None
    suffix = client_order_id.rsplit("-", 1)[-1]
    if not suffix.isdigit():
        return None
    return int(suffix)


def _decision_rows(summary: dict[str, Any], markout_ms: int, dataset_override: Path | None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    best_run = summary.get("bestRun", {})
    decisions = best_run.get("riskDecisions", [])
    dataset_path_raw = dataset_override or (Path(summary["datasetPath"]) if summary.get("datasetPath") else None)
    dataset_path = dataset_path_raw if isinstance(dataset_path_raw, Path) else None
    midpoint_index: dict[tuple[str, str], dict[str, list[float]]] = {}
    dataset_loaded = False

    if dataset_path and dataset_path.exists():
        midpoint_index = _load_dataset_midpoints(dataset_path)
        dataset_loaded = True

    rows: list[dict[str, Any]] = []
    for record in decisions:
        if not isinstance(record, dict):
            continue
        strategy = record.get("strategyDecision", {})
        risk = record.get("riskDecision", {})
        market = record.get("market", {})
        features = record.get("features", {})
        side = strategy.get("side")
        score = _to_float(strategy.get("heuristicScore"))
        if score is None:
            score = _to_float(strategy.get("decisionScore"))
        midpoint = _to_float(market.get("midpoint"))
        ts = record.get("ts")
        market_id = record.get("marketId")
        outcome_token_id = record.get("outcomeTokenId")
        future_midpoint = None
        signed_markout = None

        if (
            dataset_loaded
            and isinstance(ts, int)
            and isinstance(market_id, str)
            and isinstance(outcome_token_id, str)
            and side in {"buy", "sell"}
            and midpoint is not None
        ):
            future_midpoint = _future_midpoint(midpoint_index, market_id, outcome_token_id, ts, markout_ms)
            if future_midpoint is not None:
                raw_markout = future_midpoint - midpoint
                signed_markout = raw_markout if side == "buy" else -raw_markout

        rows.append(
            {
                "ts": ts,
                "marketId": market_id,
                "outcomeTokenId": outcome_token_id,
                "marketType": record.get("marketType"),
                "actionType": strategy.get("actionType"),
                "side": side,
                "approved": risk.get("approved"),
                "heuristicScore": score,
                "confidence": _to_float(strategy.get("confidence")),
                "estimatedEdge": _to_float(strategy.get("estimatedEdge")),
                "estimatedFairValue": _to_float(strategy.get("estimatedFairValue")),
                "midpoint": midpoint,
                "spread": _to_float(market.get("spread")),
                "topBookDepth": _to_float(market.get("topBookDepth")),
                "timeToExpiryHours": _to_float(market.get("timeToExpiryHours")),
                "liquidity": _to_float(market.get("liquidity")),
                "volume24hr": _to_float(market.get("volume24hr")),
                "volume": _to_float(market.get("volume")),
                "positionSize": _to_float(record.get("inventory", {}).get("positionSize")),
                "futureMidpoint": future_midpoint,
                "signedMarkout": signed_markout,
                "feature_midpoint": _to_float(features.get("midpoint")),
                "feature_spread": _to_float(features.get("spread")),
                "feature_microprice": _to_float(features.get("microprice")),
                "feature_topBookImbalance": _to_float(features.get("topBookImbalance")),
                "feature_shortTermMidpointDrift": _to_float(features.get("shortTermMidpointDrift")),
                "feature_shortTermSpreadDelta": _to_float(features.get("shortTermSpreadDelta")),
                "feature_recentOrderBookPressure": _to_float(features.get("recentOrderBookPressure")),
                "feature_timeToExpiryHours": _to_float(features.get("timeToExpiryHours")),
                "feature_recentVolatilityProxy": _to_float(features.get("recentVolatilityProxy")),
                "feature_inventoryAwareBias": _to_float(features.get("inventoryAwareBias")),
                "feature_observationCount": _to_float(features.get("observationCount")),
            }
        )

    return rows, {
        "dataset_loaded": dataset_loaded,
        "dataset_path": str(dataset_path) if dataset_path else None,
        "markout_ms": markout_ms,
    }


def _trade_rows(summary: dict[str, Any]) -> list[dict[str, Any]]:
    best_run = summary.get("bestRun", {})
    fills = best_run.get("fills", [])
    fills_by_id = {
        fill.get("fillId"): fill
        for fill in fills
        if isinstance(fill, dict) and isinstance(fill.get("fillId"), str)
    }
    decision_lookup = {
        key: record
        for record in best_run.get("riskDecisions", [])
        if isinstance(record, dict) and (key := _decision_key(record)) is not None
    }
    trade_records = {
        trade.get("tradeId"): trade
        for trade in best_run.get("trades", [])
        if isinstance(trade, dict) and isinstance(trade.get("tradeId"), str)
    }

    rows: list[dict[str, Any]] = []
    for lifecycle in best_run.get("closedTradeLifecycles", []):
        if not isinstance(lifecycle, dict):
            continue

        trade_id = lifecycle.get("tradeId")
        side = lifecycle.get("side")
        fill_ids = lifecycle.get("fillIds", [])
        trade_fills = [fills_by_id[fill_id] for fill_id in fill_ids if fill_id in fills_by_id]
        if side not in {"buy", "sell"} or not trade_fills:
            continue

        entry_fills = [fill for fill in trade_fills if fill.get("side") == side]
        exit_fills = [fill for fill in trade_fills if fill.get("side") != side]
        decision_pairs: list[tuple[dict[str, Any], float]] = []
        for fill in entry_fills:
            client_order_id = fill.get("clientOrderId")
            if not isinstance(client_order_id, str):
                continue
            decision_ts = _parse_decision_ts(client_order_id)
            if decision_ts is None:
                continue
            key = (fill.get("marketId"), fill.get("outcomeTokenId"), decision_ts)
            decision = decision_lookup.get(key)
            if not decision:
                continue
            size = _to_float(fill.get("size")) or 0.0
            if size > 0:
                decision_pairs.append((decision, size))

        def weighted_from(path: tuple[str, ...]) -> float | None:
            pairs: list[tuple[float | None, float]] = []
            for decision, weight in decision_pairs:
                current: Any = decision
                for segment in path:
                    if not isinstance(current, dict):
                        current = None
                        break
                    current = current.get(segment)
                pairs.append((_to_float(current), weight))
            return _weighted_average(pairs)

        maker_entry_size = sum(_to_float(fill.get("size")) or 0.0 for fill in entry_fills if fill.get("liquidity") == "maker")
        maker_exit_size = sum(_to_float(fill.get("size")) or 0.0 for fill in exit_fills if fill.get("liquidity") == "maker")
        taker_exit_size = sum(_to_float(fill.get("size")) or 0.0 for fill in exit_fills if fill.get("liquidity") == "taker")
        total_fees = sum(_to_float(fill.get("fee")) or 0.0 for fill in trade_fills)
        taker_penalty_units = sum(_to_float(fill.get("size")) or 0.0 for fill in exit_fills if fill.get("liquidity") == "taker")

        behavior = "maker_only"
        if taker_exit_size > 0 and maker_exit_size > 0:
            behavior = "mixed_exit"
        elif taker_exit_size > 0:
            behavior = "taker_exit"

        trade_record = trade_records.get(trade_id, {})
        realized_pnl = _to_float(lifecycle.get("realizedPnl"))
        if realized_pnl is None:
            realized_pnl = _to_float(trade_record.get("realizedPnl")) or 0.0
        fees = _to_float(lifecycle.get("fees"))
        if fees is None:
            fees = _to_float(trade_record.get("fees")) or total_fees

        score = weighted_from(("strategyDecision", "heuristicScore"))
        if score is None:
            score = weighted_from(("strategyDecision", "decisionScore"))
        row = {
            "tradeId": trade_id,
            "marketId": lifecycle.get("marketId"),
            "outcomeTokenId": lifecycle.get("outcomeTokenId"),
            "marketType": trade_record.get("marketType")
            or (decision_pairs[0][0].get("marketType") if decision_pairs else None),
            "side": side,
            "openedAtTs": lifecycle.get("openedAtTs"),
            "closedAtTs": lifecycle.get("closedAtTs"),
            "durationMs": _to_float(trade_record.get("durationMs")) or _to_float(
                (lifecycle.get("closedAtTs") or 0) - (lifecycle.get("openedAtTs") or 0)
            ),
            "sizeOpened": _to_float(lifecycle.get("sizeOpened")),
            "sizeClosed": _to_float(lifecycle.get("sizeClosed")),
            "realizedPnl": realized_pnl,
            "grossPnlBeforeFees": realized_pnl + fees,
            "fees": fees,
            "win": 1 if realized_pnl > 0 else 0,
            "heuristicScore": score,
            "confidence": weighted_from(("strategyDecision", "confidence")),
            "estimatedEdge": weighted_from(("strategyDecision", "estimatedEdge")),
            "entrySpread": weighted_from(("market", "spread")),
            "entryLiquidity": weighted_from(("market", "liquidity")),
            "entryVolume24hr": weighted_from(("market", "volume24hr")),
            "entryTopBookDepth": weighted_from(("market", "topBookDepth")),
            "entryTimeToExpiryHours": weighted_from(("market", "timeToExpiryHours")),
            "feature_topBookImbalance": weighted_from(("features", "topBookImbalance")),
            "feature_shortTermMidpointDrift": weighted_from(("features", "shortTermMidpointDrift")),
            "feature_shortTermSpreadDelta": weighted_from(("features", "shortTermSpreadDelta")),
            "feature_recentOrderBookPressure": weighted_from(("features", "recentOrderBookPressure")),
            "feature_recentVolatilityProxy": weighted_from(("features", "recentVolatilityProxy")),
            "feature_inventoryAwareBias": weighted_from(("features", "inventoryAwareBias")),
            "makerEntrySize": maker_entry_size,
            "makerExitSize": maker_exit_size,
            "takerExitSize": taker_exit_size,
            "takerPenaltyUnits": taker_penalty_units,
            "exitBehavior": behavior,
        }
        rows.append(row)

    return rows


def _summary_metrics(rows: list[dict[str, Any]], pnl_key: str = "realizedPnl") -> dict[str, Any]:
    pnls = [row[pnl_key] for row in rows if _is_number(row.get(pnl_key))]
    wins = [row for row in rows if row.get("win") == 1]
    losses = [row for row in rows if row.get("win") == 0]
    return {
        "trades": len(rows),
        "winRate": len(wins) / len(rows) if rows else None,
        "expectancy": _safe_mean(pnls),
        "netPnl": sum(pnls) if pnls else None,
        "avgWin": _safe_mean([row[pnl_key] for row in wins if _is_number(row.get(pnl_key))]),
        "avgLoss": _safe_mean([row[pnl_key] for row in losses if _is_number(row.get(pnl_key))]),
        "avgHeuristicScore": _safe_mean(
            [row["heuristicScore"] for row in rows if _is_number(row.get("heuristicScore"))]
        ),
    }


def _score_bucket(score: float, width: float) -> str:
    clamped = min(max(score, 0.0), 1.0)
    index = min(int(clamped / width), int(math.ceil(1.0 / width)) - 1)
    lower = index * width
    upper = min(1.0, lower + width)
    bracket = "]" if upper >= 1.0 else ")"
    return f"[{lower:.2f}, {upper:.2f}{bracket}"


def _group_metrics(rows: list[dict[str, Any]], key_name: str, pnl_key: str = "realizedPnl") -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get(key_name, "missing"))].append(row)

    results: list[dict[str, Any]] = []
    for key, group_rows in sorted(grouped.items(), key=lambda item: item[0]):
        metrics = _summary_metrics(group_rows, pnl_key=pnl_key)
        results.append({key_name: key, **metrics})
    return results


def _assign_quantile_buckets(rows: list[dict[str, Any]], value_key: str, bucket_count: int, label_key: str) -> list[dict[str, Any]]:
    enriched = [dict(row) for row in rows]
    ranked = sorted(
        [(row.get(value_key), index) for index, row in enumerate(enriched) if _is_number(row.get(value_key))],
        key=lambda item: item[0],
    )
    if not ranked:
        return enriched

    bucket_bounds: dict[int, tuple[float, float]] = {}
    total = len(ranked)
    for position, (value, index) in enumerate(ranked):
        bucket = min((position * bucket_count) // total, bucket_count - 1)
        enriched[index][label_key] = f"Q{bucket + 1}"
        if bucket not in bucket_bounds:
            bucket_bounds[bucket] = (value, value)
        else:
            lower, upper = bucket_bounds[bucket]
            bucket_bounds[bucket] = (lower, value if value > upper else upper)

    for row in enriched:
        if label_key not in row:
            row[label_key] = "missing"
            continue
        bucket_index = int(str(row[label_key]).removeprefix("Q")) - 1
        lower, upper = bucket_bounds[bucket_index]
        row[label_key] = f"{row[label_key]} [{lower:.6f}, {upper:.6f}]"

    return enriched


def _time_to_expiry_bucket(hours: float | None) -> str:
    if hours is None:
        return "missing"
    if hours < 1:
        return "<1h"
    if hours < 3:
        return "1h-3h"
    if hours < 6:
        return "3h-6h"
    if hours < 12:
        return "6h-12h"
    if hours < 24:
        return "12h-24h"
    return "24h+"


def _feature_distribution_rows(decision_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    numeric_keys = [
        "heuristicScore",
        "confidence",
        "estimatedEdge",
        "spread",
        "topBookDepth",
        "timeToExpiryHours",
        "liquidity",
        "volume24hr",
        "volume",
        "positionSize",
        "feature_midpoint",
        "feature_spread",
        "feature_microprice",
        "feature_topBookImbalance",
        "feature_shortTermMidpointDrift",
        "feature_shortTermSpreadDelta",
        "feature_recentOrderBookPressure",
        "feature_timeToExpiryHours",
        "feature_recentVolatilityProxy",
        "feature_inventoryAwareBias",
        "feature_observationCount",
    ]
    rows: list[dict[str, Any]] = []
    for key in numeric_keys:
        values = sorted(row[key] for row in decision_rows if _is_number(row.get(key)))
        if not values:
            continue
        rows.append(
            {
                "feature": key,
                "samples": len(values),
                "mean": _safe_mean(values),
                "stdev": _safe_stdev(values),
                "min": values[0],
                "p05": _quantile(values, 0.05),
                "p25": _quantile(values, 0.25),
                "p50": _quantile(values, 0.50),
                "p75": _quantile(values, 0.75),
                "p95": _quantile(values, 0.95),
                "max": values[-1],
            }
        )
    return rows


def _feature_importance_rows(decision_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    feature_keys = [
        "heuristicScore",
        "confidence",
        "estimatedEdge",
        "spread",
        "topBookDepth",
        "timeToExpiryHours",
        "liquidity",
        "volume24hr",
        "feature_midpoint",
        "feature_spread",
        "feature_microprice",
        "feature_topBookImbalance",
        "feature_shortTermMidpointDrift",
        "feature_shortTermSpreadDelta",
        "feature_recentOrderBookPressure",
        "feature_recentVolatilityProxy",
        "feature_inventoryAwareBias",
        "feature_observationCount",
    ]
    target_rows = [
        row
        for row in decision_rows
        if row.get("approved") and row.get("side") in {"buy", "sell"} and _is_number(row.get("signedMarkout"))
    ]
    results: list[dict[str, Any]] = []
    for key in feature_keys:
        paired = [
            (_to_float(row.get(key)), _to_float(row.get("signedMarkout")))
            for row in target_rows
        ]
        xs = [x for x, y in paired if x is not None and y is not None]
        ys = [y for x, y in paired if x is not None and y is not None]
        if len(xs) < 5:
            continue

        ordered = sorted(zip(xs, ys, strict=True), key=lambda item: item[0])
        quartile_size = max(1, len(ordered) // 4)
        bottom = [item[1] for item in ordered[:quartile_size]]
        top = [item[1] for item in ordered[-quartile_size:]]
        results.append(
            {
                "feature": key,
                "samples": len(xs),
                "pearsonToMarkout": _pearson(xs, ys),
                "spearmanToMarkout": _spearman(xs, ys),
                "bottomQuartileMeanMarkout": _safe_mean(bottom),
                "topQuartileMeanMarkout": _safe_mean(top),
                "quartileLift": (_safe_mean(top) or 0.0) - (_safe_mean(bottom) or 0.0),
                "positiveMarkoutRate": sum(1 for value in ys if value > 0) / len(ys),
            }
        )

    results.sort(key=lambda row: abs(row.get("spearmanToMarkout") or 0.0), reverse=True)
    return results


def _decision_score_bucket_rows(decision_rows: list[dict[str, Any]], width: float) -> list[dict[str, Any]]:
    directional = [
        row
        for row in decision_rows
        if row.get("approved")
        and row.get("side") in {"buy", "sell"}
        and _is_number(row.get("heuristicScore"))
    ]
    for row in directional:
        row["heuristicScoreBucket"] = _score_bucket(float(row["heuristicScore"]), width)

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in directional:
        grouped[row["heuristicScoreBucket"]].append(row)

    results: list[dict[str, Any]] = []
    for bucket, rows in sorted(grouped.items()):
        markouts = [row["signedMarkout"] for row in rows if _is_number(row.get("signedMarkout"))]
        results.append(
            {
                "heuristicScoreBucket": bucket,
                "decisions": len(rows),
                "positiveMarkoutRate": sum(1 for value in markouts if value > 0) / len(markouts) if markouts else None,
                "meanSignedMarkout": _safe_mean(markouts),
                "medianSignedMarkout": _safe_median(markouts),
            }
        )
    return results


def _trade_score_bucket_rows(trade_rows: list[dict[str, Any]], width: float) -> list[dict[str, Any]]:
    bucketed = [dict(row) for row in trade_rows if _is_number(row.get("heuristicScore"))]
    for row in bucketed:
        row["heuristicScoreBucket"] = _score_bucket(float(row["heuristicScore"]), width)
    results = _group_metrics(bucketed, "heuristicScoreBucket")
    for result in results:
        bucket_rows = [
            row for row in bucketed if row["heuristicScoreBucket"] == result["heuristicScoreBucket"]
        ]
        result["makerOnlyShare"] = sum(1 for row in bucket_rows if row["exitBehavior"] == "maker_only") / len(bucket_rows)
    return results


def _fee_sensitivity_rows(trade_rows: list[dict[str, Any]], multipliers: list[float]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for multiplier in multipliers:
        stressed = []
        for row in trade_rows:
            pnl = row["grossPnlBeforeFees"] - row["fees"] * multiplier
            stressed.append({**row, "stressedPnl": pnl, "win": 1 if pnl > 0 else 0})
        metrics = _summary_metrics(stressed, pnl_key="stressedPnl")
        results.append({"feeMultiplier": multiplier, **metrics})
    return results


def _slippage_sensitivity_rows(trade_rows: list[dict[str, Any]], slippage_grid: list[float]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for slippage in slippage_grid:
        stressed = []
        for row in trade_rows:
            pnl = row["realizedPnl"] - row["takerPenaltyUnits"] * slippage
            stressed.append({**row, "stressedPnl": pnl, "win": 1 if pnl > 0 else 0})
        metrics = _summary_metrics(stressed, pnl_key="stressedPnl")
        results.append({"extraTakerSlippage": slippage, **metrics})
    return results


def _rolling_stability_rows(trade_rows: list[dict[str, Any]], window: int) -> list[dict[str, Any]]:
    ordered = sorted(
        [row for row in trade_rows if isinstance(row.get("closedAtTs"), int)],
        key=lambda row: row["closedAtTs"],
    )
    results: list[dict[str, Any]] = []
    cumulative = 0.0
    for index, row in enumerate(ordered):
        cumulative += row["realizedPnl"]
        if index + 1 < window:
            continue
        segment = ordered[index + 1 - window : index + 1]
        metrics = _summary_metrics(segment)
        results.append(
            {
                "windowEndTs": row["closedAtTs"],
                "windowTrades": len(segment),
                "rollingWinRate": metrics["winRate"],
                "rollingExpectancy": metrics["expectancy"],
                "rollingNetPnl": metrics["netPnl"],
                "cumulativeNetPnl": cumulative,
            }
        )
    return results


def _score_threshold_rows(trade_rows: list[dict[str, Any]], width: float, min_trades: int) -> list[dict[str, Any]]:
    thresholds = [round(index * width, 10) for index in range(int(1 / width) + 1)]
    results: list[dict[str, Any]] = []
    total_trades = len(trade_rows)
    for threshold in thresholds:
        filtered = [
            row
            for row in trade_rows
            if _is_number(row.get("heuristicScore")) and row["heuristicScore"] >= threshold
        ]
        if len(filtered) < min_trades:
            continue
        metrics = _summary_metrics(filtered)
        results.append(
            {
                "heuristicScoreThreshold": threshold,
                "tradeShare": len(filtered) / total_trades if total_trades else None,
                **metrics,
            }
        )
    return results


def _parameter_robustness_rows(summary: dict[str, Any]) -> list[dict[str, Any]]:
    sweep_results = summary.get("sweepResults", [])
    if not isinstance(sweep_results, list) or not sweep_results:
        return []

    grouped: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for result in sweep_results:
        if not isinstance(result, dict):
            continue
        overrides = result.get("overrides", {})
        report = result.get("report", {})
        metrics = report.get("metrics", {})
        score = _to_float(result.get("score"))
        for parameter, value in overrides.items():
            grouped[str(parameter)][json.dumps(value, sort_keys=True)].append(
                {
                    "rawValue": value,
                    "score": score,
                    "netPnl": _to_float(metrics.get("netPnl")),
                    "expectancy": _to_float(metrics.get("expectancy")),
                    "winRate": _to_float(metrics.get("winRate")),
                }
            )

    rows: list[dict[str, Any]] = []
    for parameter, values in grouped.items():
        mean_by_value: dict[str, float] = {}
        for serialized_value, runs in values.items():
            score_values = [run["score"] for run in runs if run["score"] is not None]
            mean_by_value[serialized_value] = _safe_mean(score_values) or 0.0

        best_mean = max(mean_by_value.values()) if mean_by_value else 0.0
        tolerance = max(abs(best_mean) * 0.1, 1e-9)
        for serialized_value, runs in values.items():
            score_values = [run["score"] for run in runs if run["score"] is not None]
            expectancy_values = [run["expectancy"] for run in runs if run["expectancy"] is not None]
            pnl_values = [run["netPnl"] for run in runs if run["netPnl"] is not None]
            win_rate_values = [run["winRate"] for run in runs if run["winRate"] is not None]
            rows.append(
                {
                    "parameter": parameter,
                    "value": json.loads(serialized_value),
                    "runs": len(runs),
                    "meanScore": _safe_mean(score_values),
                    "medianScore": _safe_median(score_values),
                    "scoreStd": _safe_stdev(score_values),
                    "meanNetPnl": _safe_mean(pnl_values),
                    "meanExpectancy": _safe_mean(expectancy_values),
                    "meanWinRate": _safe_mean(win_rate_values),
                    "nearBestMeanScore": mean_by_value[serialized_value] >= best_mean - tolerance,
                }
            )
    rows.sort(key=lambda row: (row["parameter"], -(row.get("meanScore") or -math.inf)))
    return rows


def _walk_forward_summary(summary: dict[str, Any]) -> dict[str, Any]:
    rows = summary.get("walkForwardResults", [])
    if not isinstance(rows, list) or not rows:
        return {}

    train_scores = [_to_float(row.get("trainScore")) for row in rows]
    test_net_pnls = [_to_float(row.get("testReport", {}).get("metrics", {}).get("netPnl")) for row in rows]
    test_expectancies = [_to_float(row.get("testReport", {}).get("metrics", {}).get("expectancy")) for row in rows]
    test_win_rates = [_to_float(row.get("testReport", {}).get("metrics", {}).get("winRate")) for row in rows]
    return {
        "folds": len(rows),
        "meanTrainScore": _safe_mean([value for value in train_scores if value is not None]),
        "meanTestNetPnl": _safe_mean([value for value in test_net_pnls if value is not None]),
        "meanTestExpectancy": _safe_mean([value for value in test_expectancies if value is not None]),
        "meanTestWinRate": _safe_mean([value for value in test_win_rates if value is not None]),
    }


def _markdown_summary(
    summary: dict[str, Any],
    decision_context: dict[str, Any],
    decision_rows: list[dict[str, Any]],
    trade_rows: list[dict[str, Any]],
    feature_importance: list[dict[str, Any]],
    trade_score_buckets: list[dict[str, Any]],
    fee_sensitivity: list[dict[str, Any]],
    slippage_sensitivity: list[dict[str, Any]],
    rolling_stability: list[dict[str, Any]],
    threshold_rows: list[dict[str, Any]],
    parameter_robustness: list[dict[str, Any]],
    walk_forward: dict[str, Any],
) -> str:
    best_run = summary.get("bestRun", {})
    baseline = best_run.get("metrics", {})
    top_feature = feature_importance[0] if feature_importance else None
    best_bucket = max(
        trade_score_buckets,
        key=lambda row: (
            row["expectancy"] if _is_number(row.get("expectancy")) else -math.inf,
            row.get("trades") or 0,
        ),
        default=None,
    )
    stressed_fee = next((row for row in fee_sensitivity if row.get("feeMultiplier") == 1.5), None)
    stressed_slippage = next((row for row in slippage_sensitivity if row.get("extraTakerSlippage") == 0.002), None)
    positive_windows = [
        row for row in rolling_stability if _is_number(row.get("rollingExpectancy")) and row["rollingExpectancy"] > 0
    ]
    robust_thresholds = [
        row
        for row in threshold_rows
        if (row.get("expectancy") or 0) > 0 and (row.get("trades") or 0) >= 5
    ]
    robust_parameters = [row for row in parameter_robustness if row.get("nearBestMeanScore")]
    robust_parameter_labels = [
        f"{row['parameter']}={row['value']}"
        for row in robust_parameters[:8]
    ]

    lines = [
        "# Signal Quality Research Summary",
        "",
        "## Coverage",
        f"- Session: `{summary.get('sessionId', 'unknown')}`",
        f"- Decisions logged: {len(decision_rows)}",
        f"- Closed trades analyzed: {len(trade_rows)}",
        f"- Dataset markouts available: {'yes' if decision_context.get('dataset_loaded') else 'no'}",
        "",
        "## Edge Check",
        f"- Baseline net PnL: {_format_number(_to_float(baseline.get('netPnl')))}",
        f"- Baseline expectancy: {_format_number(_to_float(baseline.get('expectancy')))}",
        f"- Baseline win rate: {_format_number(_to_float(baseline.get('winRate')), 4)}",
        f"- Best heuristic-score bucket by expectancy: {best_bucket['heuristicScoreBucket']} with expectancy {_format_number(best_bucket.get('expectancy'))} across {best_bucket.get('trades')} trades" if best_bucket else "- Best heuristic-score bucket by expectancy: n/a",
        f"- Top univariate feature by markout correlation: `{top_feature['feature']}` with Spearman {_format_number(top_feature.get('spearmanToMarkout'), 4)}" if top_feature else "- Top univariate feature by markout correlation: n/a",
        "",
        "## Cost Survival",
        f"- Fee stress at 1.5x observed fees: net PnL {_format_number(stressed_fee.get('netPnl'))}, expectancy {_format_number(stressed_fee.get('expectancy'))}" if stressed_fee else "- Fee stress at 1.5x observed fees: n/a",
        f"- Extra taker slippage +0.002: net PnL {_format_number(stressed_slippage.get('netPnl'))}, expectancy {_format_number(stressed_slippage.get('expectancy'))}" if stressed_slippage else "- Extra taker slippage +0.002: n/a",
        "",
        "## Stability",
        f"- Positive rolling windows: {len(positive_windows)}/{len(rolling_stability)}" if rolling_stability else "- Positive rolling windows: n/a",
        f"- Walk-forward mean test expectancy: {_format_number(_to_float(walk_forward.get('meanTestExpectancy')))}" if walk_forward else "- Walk-forward mean test expectancy: n/a",
        "",
        "## Robust Thresholds",
        f"- Profitable heuristic-score thresholds with at least 5 trades: {', '.join(str(row['heuristicScoreThreshold']) for row in robust_thresholds[:5])}" if robust_thresholds else "- Profitable heuristic-score thresholds with at least 5 trades: none found",
        f"- Near-best swept parameter values: {', '.join(robust_parameter_labels)}" if robust_parameter_labels else "- Near-best swept parameter values: no sweep data",
        "",
        "These outputs are strongest when heuristic-score bucket expectancy is monotonic, fee/slippage stress keeps expectancy positive, rolling windows avoid long negative runs, and walk-forward test performance stays close to train performance.",
    ]
    return "\n".join(lines) + "\n"


def analyze_signal_quality(args: argparse.Namespace) -> dict[str, Any]:
    report_path = Path(args.report).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    summary = json.loads(report_path.read_text(encoding="utf8"))

    dataset_override = Path(args.dataset).resolve() if args.dataset else None
    decision_rows, decision_context = _decision_rows(summary, args.markout_ms, dataset_override)
    trade_rows = _trade_rows(summary)
    trade_rows_with_spread = _assign_quantile_buckets(trade_rows, "entrySpread", args.regime_buckets, "spreadRegime")
    trade_rows_with_liquidity = _assign_quantile_buckets(trade_rows_with_spread, "entryLiquidity", args.regime_buckets, "liquidityRegime")
    for row in trade_rows_with_liquidity:
        row["expiryBucket"] = _time_to_expiry_bucket(_to_float(row.get("entryTimeToExpiryHours")))

    feature_distributions = _feature_distribution_rows(decision_rows)
    feature_importance = _feature_importance_rows(decision_rows)
    decision_score_buckets = _decision_score_bucket_rows(decision_rows, args.score_bucket_width)
    trade_score_buckets = _trade_score_bucket_rows(trade_rows_with_liquidity, args.score_bucket_width)
    maker_vs_taker = _group_metrics(trade_rows_with_liquidity, "exitBehavior")
    pnl_by_spread = _group_metrics(trade_rows_with_liquidity, "spreadRegime")
    pnl_by_liquidity = _group_metrics(trade_rows_with_liquidity, "liquidityRegime")
    pnl_by_expiry = _group_metrics(trade_rows_with_liquidity, "expiryBucket")
    fee_sensitivity = _fee_sensitivity_rows(trade_rows_with_liquidity, args.fee_multipliers)
    slippage_sensitivity = _slippage_sensitivity_rows(trade_rows_with_liquidity, args.slippage_grid)
    rolling_stability = _rolling_stability_rows(trade_rows_with_liquidity, args.rolling_window_trades)
    threshold_robustness = _score_threshold_rows(
        trade_rows_with_liquidity,
        args.score_bucket_width,
        args.min_trades_per_threshold,
    )
    parameter_robustness = _parameter_robustness_rows(summary)
    walk_forward = _walk_forward_summary(summary)
    summary_md = _markdown_summary(
        summary,
        decision_context,
        decision_rows,
        trade_rows_with_liquidity,
        feature_importance,
        trade_score_buckets,
        fee_sensitivity,
        slippage_sensitivity,
        rolling_stability,
        threshold_robustness,
        parameter_robustness,
        walk_forward,
    )

    _write_csv(output_dir / "decision-rows.csv", decision_rows)
    _write_csv(output_dir / "trade-rows.csv", trade_rows_with_liquidity)
    _write_csv(output_dir / "feature-distributions.csv", feature_distributions)
    _write_csv(output_dir / "feature-importance.csv", feature_importance)
    _write_csv(output_dir / "decision-heuristic-score-buckets.csv", decision_score_buckets)
    _write_csv(output_dir / "trade-heuristic-score-buckets.csv", trade_score_buckets)
    _write_csv(output_dir / "maker-vs-taker.csv", maker_vs_taker)
    _write_csv(output_dir / "pnl-by-spread-regime.csv", pnl_by_spread)
    _write_csv(output_dir / "pnl-by-liquidity-regime.csv", pnl_by_liquidity)
    _write_csv(output_dir / "pnl-by-expiry-bucket.csv", pnl_by_expiry)
    _write_csv(output_dir / "fee-sensitivity.csv", fee_sensitivity)
    _write_csv(output_dir / "slippage-sensitivity.csv", slippage_sensitivity)
    _write_csv(output_dir / "rolling-stability.csv", rolling_stability)
    _write_csv(output_dir / "heuristic-score-threshold-robustness.csv", threshold_robustness)
    _write_csv(output_dir / "parameter-robustness.csv", parameter_robustness)
    _write_json(output_dir / "walk-forward-summary.json", walk_forward)
    (output_dir / "SUMMARY.md").write_text(summary_md, encoding="utf8")

    return {
        "report_path": str(report_path),
        "output_dir": str(output_dir),
        "decisions": len(decision_rows),
        "trades": len(trade_rows_with_liquidity),
        "dataset_loaded": decision_context["dataset_loaded"],
        "top_feature": feature_importance[0]["feature"] if feature_importance else None,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Research workflow for feature quality, threshold robustness, and cost survivability.",
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="signal-quality",
        choices=["signal-quality"],
        help="Research workflow to run.",
    )
    parser.add_argument("--report", required=True, help="Path to a backtest report.json file.")
    parser.add_argument("--output-dir", required=True, help="Directory for research outputs.")
    parser.add_argument("--dataset", help="Optional dataset override if report.datasetPath is stale.")
    parser.add_argument("--markout-ms", type=int, default=60_000, help="Forward markout horizon in milliseconds.")
    parser.add_argument("--rolling-window-trades", type=int, default=30, help="Rolling trade window size.")
    parser.add_argument("--score-bucket-width", type=float, default=0.1, help="Bucket width for heuristic-score analysis.")
    parser.add_argument("--regime-buckets", type=int, default=4, help="Quantile bucket count for spread/liquidity regimes.")
    parser.add_argument("--min-trades-per-threshold", type=int, default=5, help="Minimum trades needed to keep a score-threshold row.")
    parser.add_argument(
        "--fee-multipliers",
        type=lambda raw: [float(item) for item in raw.split(",") if item],
        default=[0.0, 0.5, 1.0, 1.25, 1.5, 2.0],
        help="Comma-separated multipliers applied to observed fees.",
    )
    parser.add_argument(
        "--slippage-grid",
        type=lambda raw: [float(item) for item in raw.split(",") if item],
        default=[0.0, 0.001, 0.002, 0.005],
        help="Comma-separated extra taker slippage values in price units.",
    )
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    result = analyze_signal_quality(args)
    print("research workflow complete")
    print(f"report={result['report_path']}")
    print(f"output_dir={result['output_dir']}")
    print(f"decisions={result['decisions']}")
    print(f"trades={result['trades']}")
    print(f"dataset_loaded={result['dataset_loaded']}")
    if result["top_feature"]:
        print(f"top_feature={result['top_feature']}")
