import { parseSmartQuery, type ParseSmartQueryOptions } from "./smart-query";

export interface SmartQueryClarificationAnswer {
  field: string;
  answer: string;
}

function moneyAmount(value: string) {
  return value.match(/(?:usd\s*)?\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*([km]?)/i)?.[0] ?? "";
}

function datePhrase(value: string) {
  const month =
    "january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec";
  const pattern = new RegExp(
    `(?:${month})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+20\\d{2})?|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${month})(?:,?\\s+20\\d{2})?|20\\d{2}-\\d{1,2}-\\d{1,2}`,
    "i",
  );
  return value.match(pattern)?.[0] ?? "";
}

export function refineSmartQueryWithClarification(
  query: string,
  clarification: SmartQueryClarificationAnswer,
) {
  const answer = clarification.answer.trim().slice(0, 120);
  if (!answer) return query;
  const normalizedAnswer = answer.toLowerCase();

  if (clarification.field === "amount") {
    const amount = moneyAmount(query);
    if (!amount) return `${query} ${answer}`.trim();
    const withoutAmount = query.replace(amount, " ").replace(/\s+/g, " ").trim();
    if (/max|upper|at most|under|less/.test(normalizedAnswer)) {
      return `${withoutAmount} at most ${amount}`.trim();
    }
    if (/min|lower|at least|over|more/.test(normalizedAnswer)) {
      return `${withoutAmount} at least ${amount}`.trim();
    }
    if (/exact|equal/.test(normalizedAnswer)) {
      return `${withoutAmount} ${amount} to ${amount}`.trim();
    }
  }

  if (clarification.field === "deadline") {
    const date = datePhrase(query);
    if (!date) return `${query} ${answer}`.trim();
    const withoutDate = query.replace(date, " ").replace(/\s+/g, " ").trim();
    if (/deadline|before|by|until/.test(normalizedAnswer)) {
      return `${withoutDate} by ${date}`.trim();
    }
    if (/start|after|from/.test(normalizedAnswer)) {
      return `${withoutDate} after ${date}`.trim();
    }
    if (/exact|on/.test(normalizedAnswer)) {
      return `${withoutDate} from ${date} through ${date}`.trim();
    }
  }

  if (clarification.field === "location") {
    return query.replace(/\bnear me\b/i, `in ${answer}`).trim();
  }

  if (clarification.field === "verified") {
    const withoutVerification = query
      .replace(/\b(unverified|not verified|without verification|no proof required|exclude verified)\b/gi, " ")
      .replace(/\b(verified|verification required|reviewed|evidence[- ]backed|proof[- ]backed|with proof|independently checked)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return /exclude|unverified|without/.test(normalizedAnswer)
      ? `${withoutVerification} unverified`.trim()
      : `${withoutVerification} verified`.trim();
  }

  return `${query} ${answer}`.replace(/\s+/g, " ").trim();
}

export function parseSmartQueryWithClarification(
  query: string,
  clarification: SmartQueryClarificationAnswer | null | undefined,
  options: ParseSmartQueryOptions = {},
) {
  const refinedQuery = clarification
    ? refineSmartQueryWithClarification(query, clarification)
    : query;
  return {
    refinedQuery,
    interpretation: parseSmartQuery(refinedQuery, options),
  };
}
