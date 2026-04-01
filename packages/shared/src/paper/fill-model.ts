import type { OrderBookSnapshot } from "../types/index.js";
import { DEFAULT_EXECUTION_FRICTION_CONFIG } from "../execution-friction.js";
import type {
  FillSimulationResult,
  PaperAggressiveExitRequest,
  PaperFillModel,
  PaperFillModelConfig,
  PaperOrderRecord,
} from "./types.js";

function round(value: number, digits = 8): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const DEFAULT_PAPER_FILL_MODEL_CONFIG: PaperFillModelConfig = {
  passiveParticipationRate: 0.15,
  minTouchesBeforeFill: 2,
  queuePriorityDelayMs: 1_500,
  staleOrderAfterMs: 20_000,
  staleParticipationMultiplier: 0.4,
  minPartialFillSize: 1,
  executionFriction: { ...DEFAULT_EXECUTION_FRICTION_CONFIG },
};

function bestOpposite(snapshot: OrderBookSnapshot, side: PaperOrderRecord["side"]) {
  return side === "buy" ? snapshot.asks[0] : snapshot.bids[0];
}

export class ConservativePaperFillModel implements PaperFillModel {
  simulatePassiveFill(
    order: PaperOrderRecord,
    snapshot: OrderBookSnapshot,
    config: PaperFillModelConfig,
  ): FillSimulationResult | null {
    /**
     * Conservative assumption:
     * a resting passive order only fills after estimated queue ahead is consumed,
     * and only receives a participation-sized share of residual price-through flow.
     *
     * We do not treat repeated touches or shrinking displayed size at the same price
     * as sufficient evidence of a fill because those changes may be cancellations.
     */
    const top = bestOpposite(snapshot, order.side);
    if (!top) {
      return null;
    }

    const touched = order.side === "buy" ? top.price <= order.price : top.price >= order.price;
    if (!touched) {
      return null;
    }

    const restedForMs = snapshot.ts - order.createdAtTs;
    if (restedForMs < config.queuePriorityDelayMs) {
      return null;
    }

    if (order.touchCount < config.minTouchesBeforeFill) {
      return null;
    }

    if ((order.queueAheadEstimate ?? Infinity) > 0) {
      return null;
    }

    const staleMultiplier =
      snapshot.ts - order.createdAtTs >= config.staleOrderAfterMs
        ? config.staleParticipationMultiplier
        : 1;

    const accessibleSize = round(
      (order.availableLiquidityEstimate ?? 0) * config.passiveParticipationRate * staleMultiplier,
      8,
    );
    const filledSize = Math.min(order.remainingSize, accessibleSize);

    if (filledSize < config.minPartialFillSize) {
      return null;
    }

    return {
      filledSize: round(filledSize, 8),
      feeRate: config.executionFriction.passiveFeeRate,
      fillConfidence: "price_through_inferred" as const,
    };
  }

  simulateAggressiveExitFill(
    request: PaperAggressiveExitRequest,
    snapshot: OrderBookSnapshot,
    config: PaperFillModelConfig,
  ) {
    const reference = request.side === "buy" ? snapshot.asks[0] : snapshot.bids[0];
    if (!reference) {
      return null;
    }

    const filledSize = round(Math.min(request.size, reference.size), 8);
    if (filledSize <= 0) {
      return null;
    }

    const fillPrice =
      request.side === "buy"
        ? reference.price + config.executionFriction.aggressiveSlippage
        : reference.price - config.executionFriction.aggressiveSlippage;

    return {
      fillPrice: round(fillPrice, 8),
      feeRate: config.executionFriction.aggressiveFeeRate,
      filledSize,
      remainingSize: round(Math.max(request.size - filledSize, 0), 8),
      fillConfidence: "displayed_depth" as const,
    };
  }
}
