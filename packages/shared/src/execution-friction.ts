export type ExecutionFrictionConfig = {
  /**
   * Fee rate charged on passive fills.
   */
  passiveFeeRate: number;
  /**
   * Conservative buffer applied when deciding whether a passive entry has enough edge.
   */
  passiveSlippageBuffer: number;
  /**
   * Fee rate charged on aggressive/taker fills.
   */
  aggressiveFeeRate: number;
  /**
   * Price concession applied to aggressive/taker execution in paper simulation.
   */
  aggressiveSlippage: number;
  /**
   * Extra margin required above explicit fees and slippage before treating an edge as tradable.
   */
  safetyMargin: number;
};

export const DEFAULT_EXECUTION_FRICTION_CONFIG: ExecutionFrictionConfig = {
  passiveFeeRate: 0.0015,
  passiveSlippageBuffer: 0.001,
  aggressiveFeeRate: 0.003,
  aggressiveSlippage: 0.002,
  safetyMargin: 0.0015,
};

export function cloneExecutionFrictionConfig(
  config: ExecutionFrictionConfig = DEFAULT_EXECUTION_FRICTION_CONFIG,
): ExecutionFrictionConfig {
  return { ...config };
}

export function passiveEntryFriction(config: ExecutionFrictionConfig): number {
  return config.passiveFeeRate + config.passiveSlippageBuffer + config.safetyMargin;
}

export function assertConsistentExecutionFriction(args: {
  strategyFriction: ExecutionFrictionConfig;
  paperFriction: ExecutionFrictionConfig;
}): void {
  const mismatches: string[] = [];

  for (const key of [
    "passiveFeeRate",
    "passiveSlippageBuffer",
    "aggressiveFeeRate",
    "aggressiveSlippage",
    "safetyMargin",
  ] as const) {
    if (args.strategyFriction[key] !== args.paperFriction[key]) {
      mismatches.push(
        `${key}: strategy=${args.strategyFriction[key]} paper=${args.paperFriction[key]}`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Execution friction config mismatch between strategy and paper simulation: ${mismatches.join(", ")}`,
    );
  }
}
