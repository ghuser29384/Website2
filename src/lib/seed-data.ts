import { SEED_OFFERS } from "@/lib/offers";
import { sortWorkedExamplesByLaunchRisk } from "@/lib/proposal-review";

export const CANONICAL_WORKED_CASE_OFFERS = sortWorkedExamplesByLaunchRisk(SEED_OFFERS);
export const CANONICAL_WORKED_CASE_COUNT = CANONICAL_WORKED_CASE_OFFERS.length;
