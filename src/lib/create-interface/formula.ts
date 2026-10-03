export const CREATE_FORMULA_LANGUAGE_VERSION = "moral_trade_timing_formula_v1" as const;

export interface FormulaContext {
  t: number;
  n: number;
  N: number;
  p: number;
}

export type FormulaAst =
  | { type: "number"; value: number }
  | { type: "variable"; name: keyof FormulaContext }
  | { type: "unary"; operator: "+" | "-"; argument: FormulaAst }
  | {
      type: "binary";
      operator: "+" | "-" | "*" | "/" | "^" | "<" | "<=" | ">" | ">=" | "==" | "!=";
      left: FormulaAst;
      right: FormulaAst;
    }
  | { type: "call"; name: string; args: FormulaAst[] };

interface Token {
  type: "number" | "identifier" | "operator" | "left" | "right" | "comma" | "eof";
  value: string | number;
}

const ALLOWED_VARIABLES = new Set<keyof FormulaContext>(["t", "n", "N", "p"]);
const ALLOWED_FUNCTIONS = new Set([
  "if",
  "min",
  "max",
  "clamp",
  "abs",
  "sqrt",
  "pow",
  "exp",
  "ln",
  "log10",
  "floor",
  "ceil",
  "round",
]);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!match) throw new Error(`Invalid number near character ${index + 1}.`);
      const value = Number(match[0]);
      if (!Number.isFinite(value)) throw new Error("Formula numbers must be finite.");
      tokens.push({ type: "number", value });
      index += match[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) throw new Error(`Invalid identifier near character ${index + 1}.`);
      tokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }

    const pair = source.slice(index, index + 2);
    if (["<=", ">=", "==", "!="].includes(pair)) {
      tokens.push({ type: "operator", value: pair });
      index += 2;
      continue;
    }

    if (["+", "-", "*", "/", "^", "<", ">"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(") tokens.push({ type: "left", value: char });
    else if (char === ")") tokens.push({ type: "right", value: char });
    else if (char === ",") tokens.push({ type: "comma", value: char });
    else throw new Error(`Unsupported character “${char}” at position ${index + 1}.`);
    index += 1;
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

export interface ParsedFormula {
  ast: FormulaAst;
  variables: Array<keyof FormulaContext>;
  nodeCount: number;
  depth: number;
}

export function parseTimingFormula(source: string): ParsedFormula {
  const normalized = source.trim();
  if (!normalized) throw new Error("Enter a formula.");
  if (normalized.length > 240) throw new Error("Formula exceeds the 240-character limit.");

  const tokens = tokenize(normalized);
  let cursor = 0;
  let nodeCount = 0;
  const variables = new Set<keyof FormulaContext>();

  const current = () => tokens[cursor]!;
  const consume = (type: Token["type"], value?: string) => {
    const token = current();
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new Error(value === undefined ? `Expected ${type}.` : `Expected “${value}”.`);
    }
    cursor += 1;
    return token;
  };
  const node = <T extends FormulaAst>(value: T): T => {
    nodeCount += 1;
    if (nodeCount > 128) throw new Error("Formula is too complex (maximum 128 syntax nodes)." );
    return value;
  };

  function parseExpression(): FormulaAst {
    return parseComparison();
  }

  function parseComparison(): FormulaAst {
    let left = parseAdditive();
    while (
      current().type === "operator" &&
      ["<", "<=", ">", ">=", "==", "!="].includes(String(current().value))
    ) {
      const operator = String(consume("operator").value) as Extract<FormulaAst, { type: "binary" }>["operator"];
      left = node({ type: "binary", operator, left, right: parseAdditive() });
    }
    return left;
  }

  function parseAdditive(): FormulaAst {
    let left = parseMultiplicative();
    while (current().type === "operator" && ["+", "-"].includes(String(current().value))) {
      const operator = String(consume("operator").value) as "+" | "-";
      left = node({ type: "binary", operator, left, right: parseMultiplicative() });
    }
    return left;
  }

  function parseMultiplicative(): FormulaAst {
    let left = parsePower();
    while (current().type === "operator" && ["*", "/"].includes(String(current().value))) {
      const operator = String(consume("operator").value) as "*" | "/";
      left = node({ type: "binary", operator, left, right: parsePower() });
    }
    return left;
  }

  function parsePower(): FormulaAst {
    let left = parseUnary();
    if (current().type === "operator" && current().value === "^") {
      consume("operator", "^");
      left = node({ type: "binary", operator: "^", left, right: parsePower() });
    }
    return left;
  }

  function parseUnary(): FormulaAst {
    if (current().type === "operator" && ["+", "-"].includes(String(current().value))) {
      const operator = String(consume("operator").value) as "+" | "-";
      return node({ type: "unary", operator, argument: parseUnary() });
    }
    return parsePrimary();
  }

  function parsePrimary(): FormulaAst {
    if (current().type === "number") {
      return node({ type: "number", value: Number(consume("number").value) });
    }

    if (current().type === "left") {
      consume("left");
      const expression = parseExpression();
      consume("right");
      return expression;
    }

    if (current().type === "identifier") {
      const name = String(consume("identifier").value);
      if (current().type === "left") {
        if (!ALLOWED_FUNCTIONS.has(name)) throw new Error(`Function “${name}” is not allowed.`);
        consume("left");
        const args: FormulaAst[] = [];
        if (current().type !== "right") {
          args.push(parseExpression());
          while (current().type === "comma") {
            consume("comma");
            args.push(parseExpression());
          }
        }
        consume("right");
        return node({ type: "call", name, args });
      }

      if (!ALLOWED_VARIABLES.has(name as keyof FormulaContext)) {
        throw new Error(`Variable “${name}” is not allowed.`);
      }
      const variable = name as keyof FormulaContext;
      variables.add(variable);
      return node({ type: "variable", name: variable });
    }

    throw new Error("Expected a number, variable, function, or parenthesized expression.");
  }

  const ast = parseExpression();
  consume("eof");

  const getDepth = (value: FormulaAst): number => {
    if (value.type === "binary") return 1 + Math.max(getDepth(value.left), getDepth(value.right));
    if (value.type === "unary") return 1 + getDepth(value.argument);
    if (value.type === "call") return 1 + Math.max(0, ...value.args.map(getDepth));
    return 1;
  };
  const depth = getDepth(ast);
  if (depth > 32) throw new Error("Formula nesting exceeds the maximum depth of 32.");

  return { ast, variables: [...variables], nodeCount, depth };
}

export function formulaContext(t: number, n: number, N: number): FormulaContext {
  return {
    t,
    n,
    N,
    p: N <= 1 ? 0 : (n - 1) / (N - 1),
  };
}

export function evaluateTimingFormula(ast: FormulaAst, context: FormulaContext): number {
  const finite = (value: number, label: string) => {
    if (!Number.isFinite(value)) throw new Error(`${label} produced a non-finite number.`);
    return value;
  };

  const evaluate = (value: FormulaAst): number => {
    if (value.type === "number") return value.value;
    if (value.type === "variable") return context[value.name];
    if (value.type === "unary") {
      const argument = evaluate(value.argument);
      return finite(value.operator === "-" ? -argument : argument, "Unary operation");
    }
    if (value.type === "binary") {
      const left = evaluate(value.left);
      const right = evaluate(value.right);
      if (value.operator === "+") return finite(left + right, "Addition");
      if (value.operator === "-") return finite(left - right, "Subtraction");
      if (value.operator === "*") return finite(left * right, "Multiplication");
      if (value.operator === "/") {
        if (Math.abs(right) < 1e-12) throw new Error("Division by zero.");
        return finite(left / right, "Division");
      }
      if (value.operator === "^") return finite(Math.pow(left, right), "Exponentiation");
      if (value.operator === "<") return left < right ? 1 : 0;
      if (value.operator === "<=") return left <= right ? 1 : 0;
      if (value.operator === ">") return left > right ? 1 : 0;
      if (value.operator === ">=") return left >= right ? 1 : 0;
      if (value.operator === "==") return Math.abs(left - right) < 1e-12 ? 1 : 0;
      return Math.abs(left - right) >= 1e-12 ? 1 : 0;
    }

    if (value.name === "if") {
      if (value.args.length !== 3) throw new Error("if requires 3 arguments.");
      return evaluate(value.args[0]!) !== 0 ? evaluate(value.args[1]!) : evaluate(value.args[2]!);
    }

    const args = value.args.map(evaluate);
    const arity = (expected: number) => {
      if (args.length !== expected) throw new Error(`${value.name} requires ${expected} argument${expected === 1 ? "" : "s"}.`);
    };
    if (value.name === "min") {
      if (!args.length) throw new Error("min requires at least 1 argument.");
      return finite(Math.min(...args), "min");
    }
    if (value.name === "max") {
      if (!args.length) throw new Error("max requires at least 1 argument.");
      return finite(Math.max(...args), "max");
    }
    if (value.name === "clamp") {
      arity(3);
      return finite(Math.min(Math.max(args[0]!, args[1]!), args[2]!), "clamp");
    }
    if (value.name === "abs") { arity(1); return finite(Math.abs(args[0]!), "abs"); }
    if (value.name === "sqrt") {
      arity(1);
      if (args[0]! < 0) throw new Error("sqrt received a negative value.");
      return finite(Math.sqrt(args[0]!), "sqrt");
    }
    if (value.name === "pow") { arity(2); return finite(Math.pow(args[0]!, args[1]!), "pow"); }
    if (value.name === "exp") { arity(1); return finite(Math.exp(args[0]!), "exp"); }
    if (value.name === "ln") {
      arity(1);
      if (args[0]! <= 0) throw new Error("ln requires a positive value.");
      return finite(Math.log(args[0]!), "ln");
    }
    if (value.name === "log10") {
      arity(1);
      if (args[0]! <= 0) throw new Error("log10 requires a positive value.");
      return finite(Math.log10(args[0]!), "log10");
    }
    if (value.name === "floor") { arity(1); return Math.floor(args[0]!); }
    if (value.name === "ceil") { arity(1); return Math.ceil(args[0]!); }
    if (value.name === "round") { arity(1); return Math.round(args[0]!); }
    throw new Error(`Function “${value.name}” is not allowed.`);
  };

  return finite(evaluate(ast), "Formula");
}

export interface FormulaValidationResult {
  valid: boolean;
  parsed?: ParsedFormula;
  errors: string[];
  sampledMinimum?: number;
  sampledMaximum?: number;
}

export function validateTimingFormula(source: string): FormulaValidationResult {
  try {
    const parsed = parseTimingFormula(source);
    const Ns = [1, 2, 5, 10, 100, 1000];
    const tValues = Array.from({ length: 41 }, (_, index) => index / 40);
    const tolerance = 1e-9;
    let minimum = Infinity;
    let maximum = -Infinity;
    let timeMonotonic = true;
    let rankMonotonic = true;

    for (const N of Ns) {
      const ranks = new Set<number>([1, N]);
      const divisions = Math.min(40, Math.max(1, N - 1));
      for (let index = 0; index <= divisions; index += 1) {
        ranks.add(Math.max(1, Math.min(N, Math.round(1 + (index * (N - 1)) / divisions))));
      }
      const sortedRanks = [...ranks].sort((a, b) => a - b);

      for (const n of sortedRanks) {
        let prior = Infinity;
        for (const t of tValues) {
          const output = evaluateTimingFormula(parsed.ast, formulaContext(t, n, N));
          minimum = Math.min(minimum, output);
          maximum = Math.max(maximum, output);
          if (output > prior + tolerance) timeMonotonic = false;
          prior = output;
        }
      }

      for (const t of tValues) {
        let prior = Infinity;
        for (const n of sortedRanks) {
          const output = evaluateTimingFormula(parsed.ast, formulaContext(t, n, N));
          if (output > prior + tolerance) rankMonotonic = false;
          prior = output;
        }
      }
    }

    const errors: string[] = [];
    if (minimum < -tolerance || maximum > 1 + tolerance) {
      errors.push(`Formula output must stay between 0 and 1; sampled range was ${minimum} to ${maximum}.`);
    }
    if (!timeMonotonic) errors.push("Formula must not reward later acceptance times more than earlier times.");
    if (!rankMonotonic) errors.push("Formula must not reward later contributor ranks more than earlier ranks.");

    return {
      valid: errors.length === 0,
      parsed,
      errors,
      sampledMinimum: minimum,
      sampledMaximum: maximum,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "Formula validation failed."],
    };
  }
}
