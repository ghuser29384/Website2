export interface MoralTradeVercelCron {
  path: string;
  schedule: string;
}

export interface MoralTradeVercelProjectConfig {
  ignoreCommand: string;
  crons: MoralTradeVercelCron[];
}

export declare const CANONICAL_MORAL_TRADE_PROJECT_ID: string;
export declare const DUPLICATE_WEBSITE2_PROJECT_ID: string;
export declare const RECOMMENDATION_TRAINING_PATH: string;
export declare const RECOMMENDATION_TRAINING_SCHEDULE: string;

export declare function buildVercelProjectConfig(options?: {
  projectId?: string | null;
}): MoralTradeVercelProjectConfig;
