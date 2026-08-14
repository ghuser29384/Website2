import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [generatedPath, committedPath] = process.argv.slice(2);

if (!generatedPath || !committedPath) {
  throw new Error(
    "Usage: node scripts/verify-mpgf-public-goods-compacts-generated-types.mjs <generated> <committed>",
  );
}

const generated = readFileSync(generatedPath, "utf8");
const committed = readFileSync(committedPath, "utf8");

function extractNamedBlock(source, name, fromIndex = 0) {
  const marker = `${name}: {`;
  const markerIndex = source.indexOf(marker, fromIndex);
  assert.notEqual(markerIndex, -1, `Missing ${name} block.`);

  const openIndex = source.indexOf("{", markerIndex);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex + 1, index);
      }
    }
  }

  throw new Error(`Unclosed ${name} block.`);
}

function fieldNames(block) {
  return [...block.matchAll(/^\s{10,}([a-z][a-z0-9_]*)(?:\?)?:/gm)]
    .map((match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

function rowFields(source, tableName) {
  const table = extractNamedBlock(source, tableName);
  return fieldNames(extractNamedBlock(table, "Row"));
}

function insertFields(source, tableName) {
  const table = extractNamedBlock(source, tableName);
  return fieldNames(extractNamedBlock(table, "Insert"));
}

function updateContract(source, tableName) {
  const table = extractNamedBlock(source, tableName);
  if (/Update:\s*never/.test(table)) {
    return { mode: "never", fields: [] };
  }
  if (/Update:\s*Partial<[^>]+\["Insert"\]>/.test(table)) {
    return { mode: "partial_insert", fields: insertFields(source, tableName) };
  }
  return { mode: "generated_block", fields: fieldNames(extractNamedBlock(table, "Update")) };
}

function argumentFields(source, functionName) {
  const functionBlock = extractNamedBlock(source, functionName);
  const argsMarker = functionBlock.indexOf("Args:");
  assert.notEqual(argsMarker, -1, `Missing Args for ${functionName}.`);
  if (!/Args:\s*\{/.test(functionBlock)) return [];
  return fieldNames(extractNamedBlock(functionBlock, "Args"));
}

function returnContract(source, functionName) {
  const functionBlock = extractNamedBlock(source, functionName);
  const match = functionBlock.match(/\bReturns:\s*([^\n;]+)/);
  assert.ok(match, `Missing Returns for ${functionName}.`);
  return match[1].replace(/\s+/g, " ").trim();
}

const tables = [
  "mpgf_public_goods_compacts",
  "mpgf_public_goods_compact_memberships",
  "mpgf_public_goods_compact_delegations",
  "mpgf_public_goods_compact_idempotency_keys",
];

const functions = [
  "get_mpgf_public_goods_compacts_state",
  "join_mpgf_public_goods_compact",
  "request_mpgf_public_goods_compact_exit",
  "set_mpgf_public_goods_compact_delegation",
  "clear_mpgf_public_goods_compact_delegation",
];

const report = {
  tables: {},
  functions: {},
  intentionalCommittedNarrowing: {
    checkConstraintLiteralUnions: true,
    idempotencyUpdatesDisabled: true,
  },
};

for (const tableName of tables) {
  const generatedRowFields = rowFields(generated, tableName);
  const committedRowFields = rowFields(committed, tableName);
  assert.deepEqual(
    generatedRowFields,
    committedRowFields,
    `Generated row columns drifted from the committed ${tableName} type contract.`,
  );
  const generatedInsertFields = insertFields(generated, tableName);
  const committedInsertFields = insertFields(committed, tableName);
  assert.deepEqual(
    generatedInsertFields,
    committedInsertFields,
    `Generated insert columns drifted from the committed ${tableName} type contract.`,
  );

  const generatedUpdate = updateContract(generated, tableName);
  const committedUpdate = updateContract(committed, tableName);
  if (committedUpdate.mode !== "never") {
    assert.deepEqual(
      generatedUpdate.fields,
      committedUpdate.fields,
      `Generated update columns drifted from the committed ${tableName} type contract.`,
    );
  }

  report.tables[tableName] = {
    row: generatedRowFields,
    insert: generatedInsertFields,
    generatedUpdateFields: generatedUpdate.fields,
    committedUpdateMode: committedUpdate.mode,
  };
}

for (const functionName of functions) {
  const generatedArgs = argumentFields(generated, functionName);
  const committedArgs = argumentFields(committed, functionName);
  assert.deepEqual(
    generatedArgs,
    committedArgs,
    `Generated arguments drifted from the committed ${functionName} type contract.`,
  );
  const generatedReturn = returnContract(generated, functionName);
  const committedReturn = returnContract(committed, functionName);
  assert.equal(
    generatedReturn,
    committedReturn,
    `Generated return contract drifted from the committed ${functionName} type contract.`,
  );
  report.functions[functionName] = {
    args: generatedArgs,
    returns: generatedReturn,
  };
}

assert.ok(
  report.tables.mpgf_public_goods_compacts.row.includes(
    "activation_identity_gate_state",
  ),
  "Generated compact types omitted the fail-closed identity gate.",
);

console.log(JSON.stringify(report, null, 2));
