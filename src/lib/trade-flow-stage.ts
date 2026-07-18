export const TRADE_FLOW_NODES = [
  "terms",
  "accepted",
  "commitments",
  "evidence",
  "complete",
] as const;

export type TradeFlowNode = (typeof TRADE_FLOW_NODES)[number];

export interface TradeFlowStage {
  completedThrough: number;
  currentIndex: number | null;
  ended: boolean;
  progressOffset: number;
}

const PROGRESS_OFFSETS = [94, 76, 53, 29, 8, 0] as const;

export function getTradeFlowStage(
  lifecycleStatus: string,
  activated: boolean,
): TradeFlowStage {
  if (lifecycleStatus === "completed") {
    return {
      completedThrough: 4,
      currentIndex: null,
      ended: false,
      progressOffset: PROGRESS_OFFSETS[5],
    };
  }

  if (lifecycleStatus === "evidence_due" || lifecycleStatus === "disputed") {
    return {
      completedThrough: 2,
      currentIndex: 3,
      ended: false,
      progressOffset: PROGRESS_OFFSETS[3],
    };
  }

  if (lifecycleStatus === "active") {
    return {
      completedThrough: 1,
      currentIndex: 2,
      ended: false,
      progressOffset: PROGRESS_OFFSETS[2],
    };
  }

  if (lifecycleStatus === "cancelled" || lifecycleStatus === "expired") {
    const completedThrough = activated ? 1 : 0;
    return {
      completedThrough,
      currentIndex: null,
      ended: true,
      progressOffset: PROGRESS_OFFSETS[completedThrough + 1],
    };
  }

  return {
    completedThrough: 0,
    currentIndex: 1,
    ended: false,
    progressOffset: PROGRESS_OFFSETS[1],
  };
}
