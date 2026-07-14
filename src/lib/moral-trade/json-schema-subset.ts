export type MoralTradeJsonSchemaDocument = Record<string, unknown> & {
  $schema?: string;
  $id?: string;
  title?: string;
  type?: string | string[];
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
};

function jsonTypeOf(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasJsonEqual(values: unknown[], value: unknown) {
  return values.some((entry) => JSON.stringify(entry) === JSON.stringify(value));
}

function resolveLocalRef(
  schema: MoralTradeJsonSchemaDocument,
  ref: string,
): MoralTradeJsonSchemaDocument | null {
  if (!ref.startsWith("#/$defs/")) {
    return null;
  }

  const defKey = ref.slice("#/$defs/".length);
  const defs = schema.$defs;

  if (!isRecord(defs)) {
    return null;
  }

  const found = defs[defKey];

  return isRecord(found) ? (found as MoralTradeJsonSchemaDocument) : null;
}

function matchesJsonSchemaType(value: unknown, schemaType: string) {
  if (schemaType === "integer") {
    return typeof value === "number" && Number.isInteger(value);
  }

  if (schemaType === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (schemaType === "object") {
    return isRecord(value);
  }

  if (schemaType === "array") {
    return Array.isArray(value);
  }

  return jsonTypeOf(value) === schemaType;
}

function validateJsonSchemaSubset(
  value: unknown,
  schema: MoralTradeJsonSchemaDocument,
  rootSchema: MoralTradeJsonSchemaDocument = schema,
  valuePath = "$",
): string[] {
  const ref = typeof schema.$ref === "string" ? schema.$ref : null;

  if (ref) {
    const resolved = resolveLocalRef(rootSchema, ref);

    if (!resolved) {
      return [`${valuePath}: unsupported or missing schema ref ${ref}`];
    }

    return validateJsonSchemaSubset(value, resolved, rootSchema, valuePath);
  }

  const failures: string[] = [];
  const allowedTypes =
    typeof schema.type === "string"
      ? [schema.type]
      : Array.isArray(schema.type) && schema.type.every((entry) => typeof entry === "string")
        ? schema.type
        : [];
  const enumValues = Array.isArray(schema.enum) ? schema.enum : null;

  if (allowedTypes.length && !allowedTypes.some((type) => matchesJsonSchemaType(value, type))) {
    failures.push(`${valuePath}: expected ${allowedTypes.join("|")}, got ${jsonTypeOf(value)}`);
    return failures;
  }

  if (enumValues && !hasJsonEqual(enumValues, value)) {
    failures.push(`${valuePath}: value is not in enum`);
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      failures.push(`${valuePath}: shorter than minLength ${schema.minLength}`);
    }

    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      failures.push(`${valuePath}: longer than maxLength ${schema.maxLength}`);
    }

    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      failures.push(`${valuePath}: does not match pattern ${schema.pattern}`);
    }
  }

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      failures.push(`${valuePath}: below minimum ${schema.minimum}`);
    }

    if (typeof schema.maximum === "number" && value > schema.maximum) {
      failures.push(`${valuePath}: above maximum ${schema.maximum}`);
    }

    if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) {
      failures.push(`${valuePath}: not above exclusiveMinimum ${schema.exclusiveMinimum}`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      failures.push(`${valuePath}: fewer than minItems ${schema.minItems}`);
    }

    if (
      schema.uniqueItems === true &&
      new Set(value.map((entry) => JSON.stringify(entry))).size !== value.length
    ) {
      failures.push(`${valuePath}: duplicate array items`);
    }

    if (isRecord(schema.items)) {
      value.forEach((entry, index) => {
        failures.push(
          ...validateJsonSchemaSubset(
            entry,
            schema.items as MoralTradeJsonSchemaDocument,
            rootSchema,
            `${valuePath}[${index}]`,
          ),
        );
      });
    }
  }

  if (isRecord(value)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required)
      ? schema.required.filter((entry): entry is string => typeof entry === "string")
      : [];
    const propertyKeys = Object.keys(properties);

    required.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(value, field)) {
        failures.push(`${valuePath}.${field}: missing required property`);
      }
    });

    if (schema.additionalProperties === false) {
      Object.keys(value)
        .filter((field) => !propertyKeys.includes(field))
        .forEach((field) => {
          failures.push(`${valuePath}.${field}: additional property`);
        });
    }

    Object.entries(properties).forEach(([field, fieldSchema]) => {
      if (Object.prototype.hasOwnProperty.call(value, field) && isRecord(fieldSchema)) {
        failures.push(
          ...validateJsonSchemaSubset(
            value[field],
            fieldSchema as MoralTradeJsonSchemaDocument,
            rootSchema,
            `${valuePath}.${field}`,
          ),
        );
      }
    });
  }

  return failures;
}

export function validateMoralTradeJsonSchemaSubset(
  value: unknown,
  schema: MoralTradeJsonSchemaDocument,
) {
  return validateJsonSchemaSubset(value, schema);
}
