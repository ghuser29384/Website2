export interface MoralTradeVercelCron {
  path: string;
  schedule: string;
}

export interface MoralTradeVercelProjectConfig {
  ignoreCommand: string;
  crons: MoralTradeVercelCron[];
}

export const CANONICAL_MORAL_TRADE_PROJECT_ID: string;
export const DUPLICATE_WEBSITE2_PROJECT_ID: string;
export const RECOMMENDATION_TRAINING_PATH: string;
export const RECOMMENDATION_TRAINING_SCHEDULE: string;
export const COLLECTIVE_COMMITMENT_EXPIRY_PATH: string;
export const COLLECTIVE_COMMITMENT_EXPIRY_SCHEDULE: string;

export function buildVercelProjectConfig(options?: {
  projectId?: string | null;
}): MoralTradeVercelProjectConfig;
