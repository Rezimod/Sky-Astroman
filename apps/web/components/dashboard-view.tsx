import type {
  MarketScannerDecision,
  MarketScannerSnapshot,
  ServiceStatus,
} from "@polymarket-bot/shared";

import type { DashboardSnapshot } from "../lib/dashboard-types";

type DashboardViewProps = {
  snapshot: DashboardSnapshot;
  fetchState: "idle" | "running" | "error";
  lastSuccessfulRefreshAt: string | null;
  selectedCandidateKey: string | null;
  onSelectCandidate: (candidateKey: string) => void;
  onRefresh: () => void;
};

type UiStateLabel = "idle" | "running" | "paused" | "error" | "paper" | "live";

type StatusTone = "neutral" | "good" | "warn" | "bad";

type DerivedEvent = {
  id: string;
  timestamp: string | null;
  title: string;
  detail: string;
  tone: StatusTone;
};

type OverviewCardData = {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
};

type FilterCheck = {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
};

function candidateKey(decision: MarketScannerDecision): string {
  return `${decision.market.marketId}:${decision.selectedOutcome.tokenId}`;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "Awaiting data";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatScore(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(digits)} / 100`;
}

function formatHours(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${formatNumber(value, digits)}h`;
}

function formatSignedNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, digits)}`;
}

function formatFractionAsPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

function formatBoolean(value: boolean): string {
  return value ? "enabled" : "disabled";
}

function toUiServiceLabel(
  status: ServiceStatus | null | undefined,
  fetchState: DashboardViewProps["fetchState"],
): UiStateLabel {
  if (fetchState === "error" || status === "degraded") {
    return "error";
  }

  if (status === "running") {
    return "running";
  }

  if (status === "stopped") {
    return "paused";
  }

  return "idle";
}

function stateExplanation(label: UiStateLabel): string {
  switch (label) {
    case "running":
      return "Healthy and actively updating.";
    case "paused":
      return "Service is loaded but not actively running.";
    case "error":
      return "Endpoint failed or the backend reported degraded health.";
    case "paper":
      return "Configured for non-live operation.";
    case "live":
      return "Venue-connected execution mode.";
    case "idle":
    default:
      return "Awaiting startup or the first successful update.";
  }
}

function stateTone(label: UiStateLabel): StatusTone {
  switch (label) {
    case "running":
    case "paper":
      return "good";
    case "paused":
      return "warn";
    case "error":
      return "bad";
    case "live":
      return "neutral";
    case "idle":
    default:
      return "neutral";
  }
}

function modeLabel(runMode: DashboardSnapshot["models"]["traderConfig"]["runMode"] | undefined): UiStateLabel {
  return runMode === "live" ? "live" : "paper";
}

function selectedScannerDecision(
  scanner: MarketScannerSnapshot | null,
  selectedKey: string | null,
): MarketScannerDecision | null {
  if (!scanner) {
    return null;
  }

  const ordered = [...scanner.candidates, ...scanner.rejected];
  if (ordered.length === 0) {
    return null;
  }

  return ordered.find((decision) => candidateKey(decision) === selectedKey) ?? ordered[0];
}

function buildDerivedEvents(snapshot: DashboardSnapshot): DerivedEvent[] {
  const events: DerivedEvent[] = [];

  if (snapshot.scanner) {
    events.push({
      id: "scanner-cycle",
      timestamp: snapshot.scanner.scannedAt,
      title: "Scanner cycle completed",
      detail: `${snapshot.scanner.acceptedCount} accepted / ${snapshot.scanner.rejectedCount} rejected in ${snapshot.scanner.cycleDurationMs} ms.`,
      tone: "good",
    });

    snapshot.scanner.rejected.slice(0, 4).forEach((decision, index) => {
      events.push({
        id: `rejected-${index}-${candidateKey(decision)}`,
        timestamp: decision.metrics.scannedAt,
        title: "Scanner rejected market",
        detail: `${decision.market.slug}: ${decision.reasons.join(", ")}`,
        tone: "warn",
      });
    });

    snapshot.scanner.candidates.slice(0, 3).forEach((decision, index) => {
      events.push({
        id: `candidate-${index}-${candidateKey(decision)}`,
        timestamp: decision.metrics.scannedAt,
        title: "Candidate ready",
        detail: `${decision.market.slug} / ${decision.selectedOutcome.outcome}: ${decision.reasons.join(", ")}`,
        tone: "neutral",
      });
    });
  }

  (snapshot.runtime?.warnings ?? []).forEach((warning, index) => {
    events.push({
      id: `warning-${index}`,
      timestamp: snapshot.runtime?.scannerLastUpdatedAt ?? snapshot.runtime?.startedAt ?? null,
      title: "Runtime warning",
      detail: warning,
      tone: "bad",
    });
  });

  Object.entries(snapshot.errors).forEach(([scope, error]) => {
    if (!error) {
      return;
    }

    events.push({
      id: `fetch-error-${scope}`,
      timestamp: snapshot.fetchedAt,
      title: `${scope} endpoint error`,
      detail: error,
      tone: "bad",
    });
  });

  return events.sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return rightTime - leftTime;
  });
}

function summarizeRejectionReasons(scanner: MarketScannerSnapshot | null): Array<{ reason: string; count: number }> {
  if (!scanner) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const decision of scanner.rejected) {
    for (const reason of decision.reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
    .slice(0, 3);
}

function selectedMarketState(decision: MarketScannerDecision | null): {
  label: string;
  detail: string;
  tone: StatusTone;
} {
  if (!decision) {
    return {
      label: "Awaiting selection",
      detail: "Pick a market row to inspect its status and filter checks.",
      tone: "neutral",
    };
  }

  if (decision.accepted) {
    return {
      label: "Passed scanner filters",
      detail: "This market cleared the current scanner thresholds and is worth reviewing first.",
      tone: "good",
    };
  }

  return {
    label: "Blocked by scanner filters",
    detail: decision.reasons[0] ?? "This market did not pass the current scanner thresholds.",
    tone: "warn",
  };
}

function capabilitySummary(snapshot: DashboardSnapshot): OverviewCardData {
  const runtime = snapshot.runtime;
  if (!runtime) {
    return {
      label: "Bot capability",
      value: "Waiting for trader",
      detail: "The dashboard is up, but the trader runtime has not replied yet.",
      tone: "neutral",
    };
  }

  return {
    label: "Bot capability",
    value:
      snapshot.paper?.status === "running" || runtime.paperTradingStatus === "running"
        ? "Scanner + paper trading"
        : "Scanner only",
    detail:
      snapshot.paper?.status === "running" || runtime.paperTradingStatus === "running"
        ? "The runtime is producing paper orders, fills, positions, and mark-to-mid PnL locally."
        : "Live market data and scanner status are available. Paper trading is not fully active yet.",
    tone:
      snapshot.paper?.status === "running" || runtime.paperTradingStatus === "running"
        ? "good"
        : "warn",
  };
}

function cycleSummary(scanner: MarketScannerSnapshot | null): OverviewCardData {
  if (!scanner) {
    return {
      label: "Current cycle",
      value: "No scan yet",
      detail: "Waiting for the first scanner snapshot from the trader service.",
      tone: "neutral",
    };
  }

  if (scanner.acceptedCount > 0) {
    return {
      label: "Current cycle",
      value: `${scanner.acceptedCount} ready / ${scanner.totalMarkets} checked`,
      detail: `${scanner.rejectedCount} markets were filtered out this cycle.`,
      tone: "good",
    };
  }

  return {
    label: "Current cycle",
    value: `0 ready / ${scanner.totalMarkets} checked`,
    detail: `${scanner.rejectedCount} markets were filtered out by the current thresholds.`,
    tone: "warn",
  };
}

function nextActionSummary(
  scanner: MarketScannerSnapshot | null,
  selectedDecision: MarketScannerDecision | null,
): OverviewCardData {
  const topReasons = summarizeRejectionReasons(scanner);
  if (!scanner) {
    return {
      label: "What to do now",
      value: "Wait for data",
      detail: "Once the scanner completes a cycle, start with the selected market panel and reason codes.",
      tone: "neutral",
    };
  }

  if (scanner.acceptedCount > 0) {
    return {
      label: "What to do now",
      value: "Inspect accepted markets",
      detail:
        selectedDecision?.accepted
          ? "Review the selected market first, then confirm its spread, depth, and expiry window."
          : "Select one of the accepted markets to see why it passed the scanner.",
      tone: "good",
    };
  }

  return {
    label: "What to do now",
    value: "Review the filters",
    detail:
      topReasons[0]
        ? `Most common blocker this cycle: ${topReasons[0].reason}. Change thresholds only with a paired backtest.`
        : "No market passed. Check the rejection summary before changing scanner thresholds.",
    tone: "warn",
  };
}

function buildOverviewCards(
  snapshot: DashboardSnapshot,
  selectedDecision: MarketScannerDecision | null,
): OverviewCardData[] {
  const selectedState = selectedMarketState(selectedDecision);

  return [
    capabilitySummary(snapshot),
    cycleSummary(snapshot.scanner),
    {
      label: "Selected market",
      value: selectedState.label,
      detail: selectedState.detail,
      tone: selectedState.tone,
    },
    nextActionSummary(snapshot.scanner, selectedDecision),
  ];
}

function buildPaperActivityEvents(snapshot: DashboardSnapshot): DerivedEvent[] {
  const paper = snapshot.paper;
  if (!paper) {
    return buildDerivedEvents(snapshot);
  }

  const fillEvents: DerivedEvent[] = paper.recentFills.slice(0, 10).map((fill) => ({
    id: `fill-${fill.fillId}`,
    timestamp: new Date(fill.ts).toISOString(),
    title: fill.aggressiveExit ? "Aggressive paper fill" : "Paper fill",
    detail: `${fill.question} / ${fill.outcome}: ${fill.side} ${formatNumber(fill.size, 0)} @ ${formatNumber(fill.price, 3)} (${fill.liquidity})`,
    tone: fill.aggressiveExit ? "warn" : "good",
  }));

  const decisionEvents: DerivedEvent[] = paper.recentDecisions.slice(0, 10).map((decision) => ({
    id: `decision-${decision.ts}-${decision.marketId}-${decision.outcomeTokenId}`,
    timestamp: new Date(decision.ts).toISOString(),
    title: `Decision ${decision.actionType} / ${decision.riskAction}`,
    detail: `${decision.question} / ${decision.outcome}: ${decision.strategyReasonCodes.join(", ")}`,
    tone:
      decision.riskAction === "REJECT"
        ? "warn"
        : decision.actionType === "HOLD"
          ? "neutral"
          : "good",
  }));

  const warningEvents: DerivedEvent[] = paper.warnings.map((warning, index) => ({
    id: `paper-warning-${index}`,
    timestamp: paper.lastUpdatedAt,
    title: "Paper trading note",
    detail: warning,
    tone: "warn",
  }));

  const combined = [...fillEvents, ...decisionEvents, ...warningEvents];
  return combined.length > 0
    ? combined.sort((left, right) => {
        const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
        const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
        return rightTime - leftTime;
      })
    : buildDerivedEvents(snapshot);
}

function buildScannerChecks(
  decision: MarketScannerDecision | null,
  config: DashboardSnapshot["models"]["traderConfig"]["scanner"],
): FilterCheck[] {
  if (!decision) {
    return [];
  }

  const checks: FilterCheck[] = [];

  const hasBook = decision.metrics.bestBid !== null && decision.metrics.bestAsk !== null;
  checks.push({
    label: "Order book",
    value: hasBook ? "Best bid and ask present" : "Incomplete top of book",
    detail: hasBook ? "The scanner can evaluate spread and midpoint." : "Scanner cannot score spread cleanly without both sides.",
    tone: hasBook ? "good" : "bad",
  });

  checks.push({
    label: "Spread filter",
    value:
      decision.metrics.spreadCents === null
        ? "No spread available"
        : `${formatNumber(decision.metrics.spreadCents, 2)}c vs max ${formatNumber(config.maxSpreadCents, 2)}c`,
    detail: "Narrower spreads are easier to enter and exit conservatively.",
    tone:
      decision.metrics.spreadCents === null
        ? "bad"
        : decision.metrics.spreadCents <= config.maxSpreadCents
          ? "good"
          : "warn",
  });

  checks.push({
    label: "Top-book depth",
    value: `${formatNumber(decision.metrics.topBookDepth, 0)} vs min ${formatNumber(config.minTopBookDepth, 0)}`,
    detail: "Depth is the visible size resting at the best bid and ask.",
    tone: decision.metrics.topBookDepth >= config.minTopBookDepth ? "good" : "warn",
  });

  checks.push({
    label: "Liquidity",
    value: `${formatNumber(decision.metrics.liquidity, 0)} vs min ${formatNumber(config.minLiquidity, 0)}`,
    detail: "This comes from market metadata, not from the live order book.",
    tone: decision.metrics.liquidity >= config.minLiquidity ? "good" : "warn",
  });

  checks.push({
    label: "24h volume",
    value: `${formatNumber(decision.metrics.volume24hr, 0)} vs min ${formatNumber(config.minVolume24hr, 0)}`,
    detail: "Higher recent volume usually means better price discovery.",
    tone: decision.metrics.volume24hr >= config.minVolume24hr ? "good" : "warn",
  });

  const expiry = decision.metrics.timeToExpiryHours;
  const expiryInRange =
    expiry !== null && expiry >= config.minHoursToExpiry && expiry <= config.maxHoursToExpiry;
  checks.push({
    label: "Expiry window",
    value:
      expiry === null
        ? "Unknown expiry"
        : `${formatHours(expiry)} vs ${formatHours(config.minHoursToExpiry)} to ${formatHours(config.maxHoursToExpiry)}`,
    detail: "The scanner prefers nearer-dated markets within the configured range.",
    tone: expiry === null ? "warn" : expiryInRange ? "good" : "warn",
  });

  checks.push({
    label: "Update activity",
    value:
      config.minUpdateFrequencyPerMinute <= 0
        ? `${formatNumber(decision.metrics.recentUpdatesPerMinute, 1)} / min, no minimum set`
        : `${formatNumber(decision.metrics.recentUpdatesPerMinute, 1)} / min vs min ${formatNumber(config.minUpdateFrequencyPerMinute, 1)} / min`,
    detail: "This is based on recent local update arrivals from the market data stream.",
    tone:
      config.minUpdateFrequencyPerMinute <= 0
        ? "neutral"
        : decision.metrics.recentUpdatesPerMinute >= config.minUpdateFrequencyPerMinute
          ? "good"
          : "warn",
  });

  return checks;
}

function StatusBadge({
  label,
  tone,
}: {
  label: UiStateLabel;
  tone?: StatusTone;
}) {
  return <span className={`status-badge tone-${tone ?? stateTone(label)}`}>{label}</span>;
}

function ToneBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`status-badge tone-${tone}`}>{label}</span>;
}

function Panel({
  title,
  eyebrow,
  className,
  children,
}: {
  title: string;
  eyebrow?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel ${className ?? ""}`.trim()}>
      <div className="panel-header">
        <div>
          {eyebrow ? <p className="panel-eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function ReadonlyField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string | number | boolean;
}) {
  if (typeof value === "boolean") {
    return (
      <label className="field">
        <span>{label}</span>
        <small>{name}</small>
        <div className="field-checkbox">
          <input checked={value} disabled readOnly type="checkbox" />
          <em>{formatBoolean(value)}</em>
        </div>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <small>{name}</small>
      <input readOnly value={String(value)} />
    </label>
  );
}

export function DashboardView({
  snapshot,
  fetchState,
  lastSuccessfulRefreshAt,
  selectedCandidateKey,
  onSelectCandidate,
  onRefresh,
}: DashboardViewProps) {
  const runtime = snapshot.runtime;
  const scanner = snapshot.scanner;
  const paper = snapshot.paper;
  const traderConfig = snapshot.models.traderConfig;
  const selectedDecision = selectedScannerDecision(scanner, selectedCandidateKey);
  const derivedEvents = buildPaperActivityEvents(snapshot);
  const overallState = runtime?.ok ? "running" : toUiServiceLabel(runtime?.scannerStatus, fetchState);
  const marketDataState = toUiServiceLabel(runtime?.marketDataStatus, fetchState);
  const paperTradingState = toUiServiceLabel(runtime?.paperTradingStatus ?? paper?.status, fetchState);
  const scannerState = toUiServiceLabel(runtime?.scannerStatus, fetchState);
  const pollingState: UiStateLabel = fetchState === "running" ? "running" : fetchState === "error" ? "error" : "idle";
  const modeState = modeLabel(runtime?.runMode ?? traderConfig.runMode);
  const overviewCards = buildOverviewCards(snapshot, selectedDecision);
  const rejectionSummary = summarizeRejectionReasons(scanner);
  const scannerChecks = buildScannerChecks(selectedDecision, traderConfig.scanner);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">desktop operator dashboard / maker-first</p>
          <h1>Polymarket Bot Control Surface</h1>
          <p className="hero-summary">
            This screen is meant to answer three questions fast: is the service healthy, did any
            market pass the scanner, and why did a specific market pass or fail. It does not invent
            trades, balances, or profit data that the backend does not publish yet.
          </p>
        </div>

        <div className="hero-actions">
          <button className="refresh-button" onClick={onRefresh} type="button">
            Refresh
          </button>
          <div className="hero-meta">
            <span>Last successful refresh</span>
            <strong>{formatTimestamp(lastSuccessfulRefreshAt)}</strong>
          </div>
        </div>
      </header>

      <section className="overview-strip">
        {overviewCards.map((card) => (
          <article className="overview-card" key={card.label}>
            <span>{card.label}</span>
            <div className="overview-card-header">
              <strong>{card.value}</strong>
              <ToneBadge label={card.tone === "good" ? "clear" : card.tone === "warn" ? "attention" : card.tone === "bad" ? "blocked" : "info"} tone={card.tone} />
            </div>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="status-strip">
        <div className="status-row">
          <span>runtime</span>
          <StatusBadge label={overallState} />
          <small>{stateExplanation(overallState)}</small>
        </div>
        <div className="status-row">
          <span>mode</span>
          <StatusBadge label={modeState} />
          <small>{stateExplanation(modeState)}</small>
        </div>
        <div className="status-row">
          <span>market data</span>
          <StatusBadge label={marketDataState} />
          <small>{stateExplanation(marketDataState)}</small>
        </div>
        <div className="status-row">
          <span>paper engine</span>
          <StatusBadge label={paperTradingState} />
          <small>{stateExplanation(paperTradingState)}</small>
        </div>
        <div className="status-row">
          <span>scanner</span>
          <StatusBadge label={scannerState} />
          <small>{stateExplanation(scannerState)}</small>
        </div>
        <div className="status-row">
          <span>polling</span>
          <StatusBadge label={pollingState} />
          <small>{stateExplanation(pollingState)}</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <Panel className="panel-settings" eyebrow="operator config" title="Bot Settings">
          <p className="panel-note">
            Source: {snapshot.models.sourceLabel}. Runtime config merge is not exposed yet, so these
            fields reflect the shared config model shape and web-side env resolution.
          </p>
          <div className="field-grid">
            <ReadonlyField label="Run mode" name="runMode" value={traderConfig.runMode} />
            <ReadonlyField label="App env" name="appEnv" value={traderConfig.appEnv} />
            <ReadonlyField label="Trader host" name="trader.host" value={traderConfig.trader.host} />
            <ReadonlyField label="Trader port" name="trader.port" value={traderConfig.trader.port} />
            <ReadonlyField label="Database URL" name="databaseUrl" value={traderConfig.databaseUrl} />
            <ReadonlyField label="Data dir" name="dataDir" value={traderConfig.dataDir} />
            <ReadonlyField
              label="REST URL"
              name="polymarket.restUrl"
              value={traderConfig.polymarket.restUrl}
            />
            <ReadonlyField label="WS URL" name="polymarket.wsUrl" value={traderConfig.polymarket.wsUrl} />
            <ReadonlyField label="Chain ID" name="polymarket.chainId" value={traderConfig.polymarket.chainId} />
            <ReadonlyField
              label="Private key configured"
              name="polymarket.privateKey"
              value={traderConfig.polymarket.privateKeyConfigured}
            />
            <ReadonlyField
              label="Funder configured"
              name="polymarket.funderAddress"
              value={traderConfig.polymarket.funderAddressConfigured}
            />
          </div>
        </Panel>

        <Panel className="panel-scanner" eyebrow="live feed" title="Market Scanner / Selected Market">
          <p className="panel-note">
            Accepted means the market passed the current scanner filters. Rejected means at least one
            filter blocked it. The score is a ranking signal from the backend, not a probability.
          </p>
          <div className="metric-grid">
            <MetricCard
              label="Accepted"
              value={formatNumber(scanner?.acceptedCount ?? null, 0)}
              detail="current scan"
            />
            <MetricCard
              label="Rejected"
              value={formatNumber(scanner?.rejectedCount ?? null, 0)}
              detail="current scan"
            />
            <MetricCard
              label="Cycle"
              value={scanner ? `${formatNumber(scanner.cycleDurationMs, 0)} ms` : "--"}
              detail="scan duration"
            />
            <MetricCard
              label="Updated"
              value={formatTimestamp(scanner?.scannedAt)}
              detail="scanner snapshot"
            />
          </div>

          <div className="scanner-summary-grid">
            <div className="coverage-card">
              <h3>Most common blockers this cycle</h3>
              <ul>
                {rejectionSummary.length > 0 ? (
                  rejectionSummary.map((item) => (
                    <li key={item.reason}>
                      {item.reason} ({item.count})
                    </li>
                  ))
                ) : (
                  <li>No rejection summary available yet.</li>
                )}
              </ul>
            </div>
            <div className="coverage-card">
              <h3>How to read the scanner</h3>
              <ul>
                <li>Start with accepted markets if any exist.</li>
                <li>If all markets are rejected, use the top blocker list before changing filters.</li>
                <li>Use the selected market panel to compare actual values against current thresholds.</li>
              </ul>
            </div>
          </div>

          <div className="scanner-layout">
            <div className="scanner-list">
              <div className="scanner-list-header">
                <h3>Ranked candidates</h3>
                <small>{scanner ? `${scanner.totalMarkets} markets reviewed` : "No scan available"}</small>
              </div>

              <div className="scanner-table">
                {(scanner ? [...scanner.candidates, ...scanner.rejected] : []).slice(0, 10).map((decision) => {
                  const key = candidateKey(decision);
                  const active = candidateKey(selectedDecision ?? decision) === key;

                  return (
                    <button
                      className={`scanner-row ${active ? "scanner-row-active" : ""}`}
                      key={key}
                      onClick={() => onSelectCandidate(key)}
                      type="button"
                    >
                      <div>
                        <strong>{decision.market.question}</strong>
                        <small>
                          {decision.selectedOutcome.outcome} / {decision.market.slug}
                        </small>
                      </div>
                      <div className="scanner-row-meta">
                        <StatusBadge
                          label={decision.accepted ? "running" : "paused"}
                          tone={decision.accepted ? "good" : "warn"}
                        />
                        <span>{formatScore(decision.score, 1)}</span>
                      </div>
                    </button>
                  );
                })}

                {!scanner ? (
                  <div className="empty-state">
                    <strong>Scanner snapshot unavailable</strong>
                    <p>
                      The dashboard is waiting for the trader service to publish `/scanner`.
                      Reasons, ranks, and selected-market metrics will appear here once the scanner
                      completes a cycle.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="scanner-detail">
              <div className="scanner-list-header">
                <h3>Selected market</h3>
                <small>
                  {selectedDecision ? selectedDecision.selectedOutcome.tokenId : "No market selected"}
                </small>
              </div>

              {selectedDecision ? (
                <>
                  <div className="selected-market">
                    <h4>{selectedDecision.market.question}</h4>
                    <p>
                      {selectedDecision.selectedOutcome.outcome} · {selectedDecision.market.status} ·{" "}
                      {selectedDecision.market.category ?? "uncategorized"}
                    </p>
                  </div>

                  <div className="metric-grid compact">
                    <MetricCard
                      label="Score"
                      value={formatScore(selectedDecision.score, 1)}
                      detail="ranking, not win probability"
                    />
                    <MetricCard
                      label="Spread"
                      value={
                        selectedDecision.metrics.spreadCents === null
                          ? "--"
                          : `${formatNumber(selectedDecision.metrics.spreadCents, 2)}c`
                      }
                      detail="current top of book"
                    />
                    <MetricCard
                      label="Depth"
                      value={formatNumber(selectedDecision.metrics.topBookDepth, 0)}
                      detail="top book"
                    />
                    <MetricCard
                      label="Liquidity"
                      value={formatNumber(selectedDecision.metrics.liquidity, 0)}
                      detail="market metadata"
                    />
                    <MetricCard
                      label="24h volume"
                      value={formatNumber(selectedDecision.metrics.volume24hr, 0)}
                      detail="market metadata"
                    />
                    <MetricCard
                      label="Expiry"
                      value={formatHours(selectedDecision.metrics.timeToExpiryHours, 1)}
                      detail="hours remaining"
                    />
                  </div>

                  <div className="reason-block">
                    <div className="reason-header">
                      <h4>Scanner decision</h4>
                      <ToneBadge
                        label={selectedDecision.accepted ? "accepted" : "rejected"}
                        tone={selectedDecision.accepted ? "good" : "warn"}
                      />
                    </div>
                    <div className="tag-list">
                      {selectedDecision.reasons.map((reason) => (
                        <span className="tag" key={reason}>
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="checks-grid">
                    {scannerChecks.map((check) => (
                      <article className="check-card" key={check.label}>
                        <div className="check-card-header">
                          <strong>{check.label}</strong>
                          <ToneBadge
                            label={
                              check.tone === "good"
                                ? "pass"
                                : check.tone === "warn"
                                  ? "watch"
                                  : check.tone === "bad"
                                    ? "fail"
                                    : "info"
                            }
                            tone={check.tone}
                          />
                        </div>
                        <p>{check.value}</p>
                        <small>{check.detail}</small>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <strong>No selected market</strong>
                  <p>Select a market row to inspect why it passed or failed the current scanner filters.</p>
                </div>
              )}

              <div className="inline-form">
                <ReadonlyField
                  label="Min liquidity"
                  name="scanner.minLiquidity"
                  value={traderConfig.scanner.minLiquidity}
                />
                <ReadonlyField
                  label="Min top book depth"
                  name="scanner.minTopBookDepth"
                  value={traderConfig.scanner.minTopBookDepth}
                />
                <ReadonlyField
                  label="Max spread cents"
                  name="scanner.maxSpreadCents"
                  value={traderConfig.scanner.maxSpreadCents}
                />
                <ReadonlyField
                  label="Min hours to expiry"
                  name="scanner.minHoursToExpiry"
                  value={traderConfig.scanner.minHoursToExpiry}
                />
                <ReadonlyField
                  label="Max hours to expiry"
                  name="scanner.maxHoursToExpiry"
                  value={traderConfig.scanner.maxHoursToExpiry}
                />
                <ReadonlyField
                  label="Refresh interval ms"
                  name="scanner.refreshIntervalMs"
                  value={traderConfig.scanner.refreshIntervalMs}
                />
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="panel-risk" eyebrow="guardrails" title="Risk Management">
          <p className="panel-note">
            Trader-level controls and shared risk-engine defaults are shown separately to keep
            portfolio guardrails distinct from decision-time risk rejection.
          </p>
          <div className="field-grid">
            <ReadonlyField
              label="Max notional / market"
              name="risk.maxNotionalPerMarket"
              value={traderConfig.risk.maxNotionalPerMarket}
            />
            <ReadonlyField
              label="Max gross exposure"
              name="risk.maxGrossExposure"
              value={traderConfig.risk.maxGrossExposure}
            />
            <ReadonlyField
              label="Max daily loss"
              name="risk.maxDailyLoss"
              value={traderConfig.risk.maxDailyLoss}
            />
            <ReadonlyField
              label="Max open orders"
              name="risk.maxOpenOrders"
              value={traderConfig.risk.maxOpenOrders}
            />
            <ReadonlyField
              label="Taker exits only"
              name="risk.allowTakerExitsOnly"
              value={traderConfig.risk.allowTakerExitsOnly}
            />
            <ReadonlyField
              label="Risk / trade notional"
              name="riskEngine.maxRiskPerTradeNotional"
              value={snapshot.models.riskEngineDefaults.maxRiskPerTradeNotional}
            />
            <ReadonlyField
              label="Inventory imbalance"
              name="riskEngine.maxInventoryImbalance"
              value={snapshot.models.riskEngineDefaults.maxInventoryImbalance}
            />
            <ReadonlyField
              label="Concurrent open orders"
              name="riskEngine.maxConcurrentOpenOrders"
              value={snapshot.models.riskEngineDefaults.maxConcurrentOpenOrders}
            />
            <ReadonlyField
              label="Stop-loss cooldown ms"
              name="riskEngine.stopLossCooldownMs"
              value={snapshot.models.riskEngineDefaults.stopLossCooldownMs}
            />
            <ReadonlyField
              label="No-trade expiry hours"
              name="riskEngine.noTradeBeforeExpiryHours"
              value={snapshot.models.riskEngineDefaults.noTradeBeforeExpiryHours}
            />
          </div>
        </Panel>

        <Panel className="panel-entry" eyebrow="signal config" title="Entry Logic Summary">
          <div className="field-grid">
            <ReadonlyField
              label="Min observations"
              name="strategy.minObservationCount"
              value={snapshot.models.strategyDefaults.minObservationCount}
            />
            <ReadonlyField
              label="Max spread"
              name="strategy.maxSpread"
              value={snapshot.models.strategyDefaults.maxSpread}
            />
            <ReadonlyField
              label="Min edge to quote"
              name="strategy.minEdgeToQuote"
              value={snapshot.models.strategyDefaults.minEdgeToQuote}
            />
            <ReadonlyField
              label="Min edge to enter"
              name="strategy.minEdgeToEnter"
              value={snapshot.models.strategyDefaults.minEdgeToEnter}
            />
            <ReadonlyField
              label="Min confidence to quote"
              name="strategy.minConfidenceToQuote"
              value={snapshot.models.strategyDefaults.minConfidenceToQuote}
            />
            <ReadonlyField
              label="Min confidence to enter"
              name="strategy.minConfidenceToEnter"
              value={snapshot.models.strategyDefaults.minConfidenceToEnter}
            />
            <ReadonlyField
              label="Max volatility to enter"
              name="strategy.maxVolatilityToEnter"
              value={snapshot.models.strategyDefaults.maxVolatilityToEnter}
            />
            <ReadonlyField
              label="Base size fraction"
              name="strategy.baseSizeFraction"
              value={snapshot.models.strategyDefaults.baseSizeFraction}
            />
          </div>
        </Panel>

        <Panel className="panel-exit" eyebrow="signal config" title="Exit Logic Summary">
          <div className="field-grid">
            <ReadonlyField
              label="Dangerous expiry hours"
              name="strategy.dangerousExpiryHours"
              value={snapshot.models.strategyDefaults.dangerousExpiryHours}
            />
            <ReadonlyField
              label="Hard exit expiry hours"
              name="strategy.hardExitExpiryHours"
              value={snapshot.models.strategyDefaults.hardExitExpiryHours}
            />
            <ReadonlyField
              label="Max volatility to hold"
              name="strategy.maxVolatilityToHoldInventory"
              value={snapshot.models.strategyDefaults.maxVolatilityToHoldInventory}
            />
            <ReadonlyField
              label="Inventory skew multiplier"
              name="strategy.inventorySkewSpreadMultiplier"
              value={snapshot.models.strategyDefaults.inventorySkewSpreadMultiplier}
            />
            <ReadonlyField
              label="Reentry cooldown ms"
              name="strategy.reentryCooldownMs"
              value={snapshot.models.strategyDefaults.reentryCooldownMs}
            />
            <ReadonlyField
              label="Loss cooldown ms"
              name="strategy.cooldownAfterLossMs"
              value={snapshot.models.strategyDefaults.cooldownAfterLossMs}
            />
            <ReadonlyField
              label="Chop cooldown ms"
              name="strategy.cooldownAfterChopMs"
              value={snapshot.models.strategyDefaults.cooldownAfterChopMs}
            />
            <ReadonlyField
              label="Exit edge threshold"
              name="strategy.exitEdgeThreshold"
              value={snapshot.models.strategyDefaults.exitEdgeThreshold}
            />
          </div>
          <div className="inline-notes">
            <p>
              <strong>Status explanation:</strong> `exitEdgeThreshold` and `cooldownLossStreak` exist
              in the shared model, but the current backend runtime does not expose a live
              edge-reversal or trade-history endpoint here yet.
            </p>
          </div>
        </Panel>

        <Panel className="panel-status" eyebrow="runtime" title="System Status">
          <div className="metric-grid compact">
            <MetricCard label="Service" value={runtime?.service ?? "trader"} detail="backend target" />
            <MetricCard label="Trader URL" value={snapshot.traderBaseUrl} detail="proxied via web" />
            <MetricCard
              label="Started"
              value={formatTimestamp(runtime?.startedAt ?? null)}
              detail="runtime clock"
            />
            <MetricCard
              label="Scanner candidates"
              value={formatNumber(runtime?.scannerCandidateCount ?? null, 0)}
              detail="health endpoint"
            />
          </div>

          <div className="status-explanations">
            {[
              { label: "idle" as const },
              { label: "running" as const },
              { label: "paused" as const },
              { label: "error" as const },
              { label: "paper" as const },
              { label: "live" as const },
            ].map(({ label }) => (
              <div className="status-row explain" key={label}>
                <StatusBadge label={label} />
                <small>{stateExplanation(label)}</small>
              </div>
            ))}
          </div>

          <div className="warning-list">
            <h3>Warnings and gaps</h3>
            <ul>
              {runtime?.warnings?.length ? (
                runtime.warnings.map((warning) => <li key={warning}>{warning}</li>)
              ) : (
                <li>No runtime warnings reported.</li>
              )}
              {paper?.warnings?.map((warning) => <li key={warning}>{warning}</li>)}
              {snapshot.errors.paper ? <li>{snapshot.errors.paper}</li> : null}
              {snapshot.errors.runtime ? <li>{snapshot.errors.runtime}</li> : null}
              {snapshot.errors.scanner ? <li>{snapshot.errors.scanner}</li> : null}
            </ul>
          </div>
        </Panel>

        <Panel className="panel-account" eyebrow="portfolio coverage" title="Demo Balance / Account Summary">
          <p className="panel-note">
            These numbers come directly from the paper-trading runtime. Equity is mark-to-mid, so it
            is useful for monitoring but still optimistic versus liquidation.
          </p>
          <div className="metric-grid compact">
            <MetricCard
              label="Starting cash"
              value={formatNumber(paper?.initialCash ?? null, 0)}
              detail="paper runtime baseline"
            />
            <MetricCard
              label="Equity"
              value={formatSignedNumber(paper?.markToMidEquity ?? null, 2)}
              detail="starting cash plus mark-to-mid PnL"
            />
            <MetricCard
              label="Realized PnL"
              value={formatSignedNumber(paper?.realizedPnl ?? null, 2)}
              detail="closed fills only"
            />
            <MetricCard
              label="Unrealized PnL"
              value={formatSignedNumber(paper?.unrealizedPnl ?? null, 2)}
              detail="open inventory at midpoint"
            />
            <MetricCard
              label="Tracked markets"
              value={formatNumber(paper?.trackedMarkets ?? null, 0)}
              detail="scanner accepted plus active inventory"
            />
            <MetricCard
              label="Open positions"
              value={formatNumber(paper?.openPositions ?? null, 0)}
              detail="non-flat positions"
            />
            <MetricCard
              label="Open orders"
              value={formatNumber(paper?.openOrders ?? null, 0)}
              detail="working passive orders"
            />
            <MetricCard
              label="Last paper update"
              value={formatTimestamp(paper?.lastUpdatedAt)}
              detail="last processed book event"
            />
          </div>

          <div className="coverage-card">
            <h3>Paper engine summary</h3>
            <ul>
              <li>Run mode: {runtime?.runMode ?? traderConfig.runMode}</li>
              <li>Paper engine status: {runtime?.paperTradingStatus ?? paper?.status ?? "idle"}</li>
              <li>
                Decisions: {formatNumber(paper?.decisionsGenerated ?? null, 0)} total / approvals{" "}
                {formatNumber(paper?.approvals ?? null, 0)} / rejections{" "}
                {formatNumber(paper?.rejections ?? null, 0)}
              </li>
              <li>Database path: {runtime?.databaseUrl ?? traderConfig.databaseUrl}</li>
              <li>
                Host: {(runtime?.traderHost ?? traderConfig.trader.host) +
                  ":" +
                  String(runtime?.traderPort ?? traderConfig.trader.port)}
              </li>
            </ul>
          </div>
        </Panel>

        <Panel className="panel-positions" eyebrow="paper runtime" title="Positions">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Outcome</th>
                  <th>Size</th>
                  <th>Average Price</th>
                  <th>Mark</th>
                  <th>Unrealized</th>
                </tr>
              </thead>
              <tbody>
                {paper?.positions.length ? (
                  paper.positions.map((position) => (
                    <tr key={`${position.marketId}:${position.outcomeTokenId}`}>
                      <td>{position.question}</td>
                      <td>{position.outcome}</td>
                      <td>{formatNumber(position.size, 0)}</td>
                      <td>{formatNumber(position.averageEntryPrice, 3)}</td>
                      <td>{formatNumber(position.markPrice, 3)}</td>
                      <td>{formatSignedNumber(position.unrealizedPnl, 2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      No open paper positions right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="panel-logs" eyebrow="derived feed" title="Activity Feed">
          <p className="panel-note">
            This feed is sourced from paper decisions, fills, and runtime warnings. It should tell you
            what the bot just did without making you parse raw JSON.
          </p>

          <div className="event-list">
            {derivedEvents.length > 0 ? (
              derivedEvents.map((event) => (
                <article className={`event tone-${event.tone}`} key={event.id}>
                  <div className="event-header">
                    <strong>{event.title}</strong>
                    <span>{formatTimestamp(event.timestamp)}</span>
                  </div>
                  <p>{event.detail}</p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>No derived events</strong>
                <p>The dashboard will list scanner cycles, runtime warnings, and rejection reasons here.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel className="panel-pnl" eyebrow="paper runtime" title="PnL And Performance Stats">
          <div className="metric-grid">
            <MetricCard
              label="Net PnL"
              value={formatSignedNumber(paper?.netPnl ?? null, 2)}
              detail="realized plus unrealized"
            />
            <MetricCard
              label="Win rate"
              value={formatFractionAsPercent(paper?.winRate ?? null, 1)}
              detail="closed paper trades"
            />
            <MetricCard
              label="Fill ratio"
              value={formatFractionAsPercent(paper?.fillRatio ?? null, 1)}
              detail="maker filled size / submitted passive size"
            />
            <MetricCard
              label="Closed trades"
              value={formatNumber(paper?.closedTrades ?? null, 0)}
              detail="completed trade lifecycles"
            />
            <MetricCard
              label="Expectancy"
              value={formatSignedNumber(paper?.expectancy ?? null, 3)}
              detail="average realized PnL per closed trade"
            />
            <MetricCard
              label="Avg win / loss"
              value={
                paper
                  ? `${formatSignedNumber(paper.avgWin, 2)} / ${formatSignedNumber(paper.avgLoss, 2)}`
                  : "--"
              }
              detail="closed trade averages"
            />
          </div>
          <div className="inline-notes">
            <p>
              Mark-to-mid equity is informative but still optimistic relative to forced liquidation.
            </p>
            {snapshot.models.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
