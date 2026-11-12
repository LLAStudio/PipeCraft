import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import schema from "@/lib/validation/schemas/github-workflow.schema.json";

// ---------------------------------------------------------------------------
// AJV-based validation against the official GitHub Actions schema
// ---------------------------------------------------------------------------

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  verbose: true,
  schemaId: "$id",
  discriminator: true,
});

addFormats(ajv);

// Compile the schema once; the schema is bundled in the project.
const validateWorkflow = ajv.compile(schema as {
  $schema: string;
  type: string;
  required: string[];
  properties: Record<string, unknown>;
});

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

export interface SchemaValidationError {
  keyword: string;
  instancePath: string;
  message: string;
  params: Record<string, unknown>;
  // Approximate nodeId derived from path (best-effort mapping back to a job id)
  jobId?: string;
  stepIndex?: number;
}

/**
 * Validate a parsed YAML object (the JavaScript representation of the
 * workflow, not the raw string) against the GitHub Actions JSON schema.
 *
 * Returns both the validity and a list of human- readable errors with
 * best-effort location hints (job id, step index) for displaying in the
 * ValidationConsole.
 */
export function validateAgainstSchema(yamlObject: unknown): SchemaValidationResult {
  if (!yamlObject || typeof yamlObject !== "object") {
    return {
      valid: false,
      errors: [
        {
          keyword: "type",
          instancePath: "",
          message: "Workflow root must be a YAML object (mapping)",
          params: { type: "object" },
        },
      ],
    };
  }

  const valid = validateWorkflow(yamlObject as Record<string, unknown>);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: SchemaValidationError[] = (validateWorkflow.errors ?? [])
    .filter((e): e is ErrorObject => e != null)
    .map((e) => {
      const jobId = extractJobIdFromPath(e.instancePath);
      const stepIndex = extractStepIndexFromPath(e.instancePath);

      const error: SchemaValidationError = {
        keyword: e.keyword,
        instancePath: e.instancePath,
        message: e.message ?? "Validation error",
        params: e.params as Record<string, unknown>,
      };
      if (jobId) error.jobId = jobId;
      if (stepIndex !== undefined) error.stepIndex = stepIndex;
      return error;
    });

  return { valid: false, errors };
}

/**
 * Try to extract a job id from an AJV instancePath like
 * "/jobs/build-and-test/steps/2/run".
 */
function extractJobIdFromPath(path: string): string | undefined {
  const parts = path.split("/").filter(Boolean);
  // Path is always like /jobs/<jobId>/... or /jobs/<jobId>/steps/...
  const jobsIdx = parts.indexOf("jobs");
  if (jobsIdx !== -1 && jobsIdx + 1 < parts.length) {
    return parts[jobsIdx + 1];
  }
  return undefined;
}

/**
 * Try to extract a step index from an AJV instancePath like
 * "/jobs/build-and-test/steps/2/run".
 */
function extractStepIndexFromPath(path: string): number | undefined {
  const parts = path.split("/").filter(Boolean);
  const stepsIdx = parts.indexOf("steps");
  if (stepsIdx !== -1 && stepsIdx + 1 < parts.length) {
    const raw = parts[stepsIdx + 1];
    const idx = Number(raw);
    if (!isNaN(idx)) return idx;
  }
  return undefined;
}

/**
 * Validate a raw YAML string by parsing it first, then validating the
 * resulting object.
 *
 * This is the convenience entry point used by the ValidationConsole.
 */
export function validateYamlString(yamlString: string): SchemaValidationResult & { parseError?: string } {
  let parsed: unknown;
  try {
    const { parse } = require("yaml");
    parsed = parse(yamlString);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      errors: [
        {
          keyword: "yaml-parse",
          instancePath: "",
          message: message,
          params: {},
        },
      ],
      parseError: message,
    };
  }

  // If the YAML parses but is not an object (e.g., a scalar), report that.
  if (typeof parsed !== "object" || parsed === null) {
    return {
      valid: false,
      errors: [
        {
          keyword: "type",
          instancePath: "",
          message: "Workflow file must contain a mapping at the top level",
          params: { type: "object" },
        },
      ],
    };
  }

  return validateAgainstSchema(parsed);
}

/**
 * Get a pre-configured AJV instance. Useful if consumers need to add
 * additional schemas or custom keywords.
 */
export function getAjvInstance(): Ajv {
  return ajv;
}
