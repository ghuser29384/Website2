/** Illustrative terms, not offers, assessed preferences, or saved user data. */
export const QUICK_EXAMPLE = {
  counterpart: "Rae",
  yourPriority: "Animal welfare",
  theirPriority: "Global poverty",
  yourMove: "Donate $20 to poverty relief",
  theirMove: "Eat vegetarian for 30 days",
  noTrade: "Without this agreement, neither makes this additional contribution.",
} as const;

export const QUICK_BARGAINS = [
  {
    id: "a", label: "Proposal A", donation: "$5", days: "30 days",
    youAgree: true, theyAgree: false,
    explanation: "You would take this trade. In this example, Rae would not change 30 days of meals for a $5 donation.",
  },
  {
    id: "b", label: "Proposal B", donation: "$50", days: "7 days",
    youAgree: false, theyAgree: true,
    explanation: "Rae would take this trade. In this example, you would not donate $50 in exchange for 7 vegetarian days.",
  },
  {
    id: "c", label: "Proposal C", donation: "$20", days: "30 days",
    youAgree: true, theyAgree: true,
    explanation: "In this example, you value Rae’s 30 vegetarian days enough to donate $20. Rae values that donation enough to change those meals.",
  },
] as const;

export type QuickBargainId = (typeof QUICK_BARGAINS)[number]["id"];

export function getQuickBargain(id: string | null) {
  return QUICK_BARGAINS.find((bargain) => bargain.id === id) ?? null;
}
