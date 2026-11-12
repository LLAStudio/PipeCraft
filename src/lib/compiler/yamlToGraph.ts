import { parseDocument } from "yaml";
import type {
  GraphNode,
  GraphNodeData,
  JobNodeData,
  ReactFlowEdge,
  ReusableWorkflowNodeData,
  SerializedGraph,
  ServiceConfig,
  StepItem,
  TriggerEvent,
  TriggerNodeData,
  WorkflowGlobalSettings,
  WorkflowPermissions,
} from "@/types/pipeline";

export interface ParseResult {
  success: boolean;
  graph: SerializedGraph | null;
  error: string | null;
  errorLine: number | null;
}

export interface ParseOptions {
  keepPositions?: boolean;
}

const TRIGGER_COLOR = "#FACC15";
const JOB_COLOR = "#A3E635";
const REUSABLE_COLOR = "#F59E0B";
const STEP_PREFIX = "step";

// ---------------------------------------------------------------------------
// Small runtime helpers around untrusted YAML values
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function asStringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(asRecord(value))) {
    if (typeof entry === "string") out[key] = entry;
    else if (typeof entry === "number" || typeof entry === "boolean") out[key] = String(entry);
  }
  return out;
}

function asRunsOn(value: unknown): string | string[] {
  const list = asStringArray(value);
  if (list.length > 1) return list;
  if (list.length === 1) return list[0] as string;
  return "ubuntu-latest";
}

// ---------------------------------------------------------------------------
// Trigger parsing
// ---------------------------------------------------------------------------

const KNOWN_EVENTS: ReadonlySet<string> = new Set<TriggerEvent>([
  "push",
  "pull_request",
  "pull_request_target",
  "schedule",
  "workflow_dispatch",
  "workflow_call",
  "workflow_run",
  "release",
  "issues",
  "issue_comment",
  "create",
  "delete",
  "fork",
  "gollum",
  "label",
  "milestone",
  "page_build",
  "public",
  "registry_package",
  "repository_dispatch",
  "status",
  "watch",
  "merge_group",
  "deployment",
  "deployment_status",
  "discussion",
  "discussion_comment",
]);

function normalizeEvent(raw: string): TriggerEvent {
  const lower = raw.trim().toLowerCase();
  return (KNOWN_EVENTS.has(lower) ? lower : lower) as TriggerEvent;
}

function parsePushConfig(config: Record<string, unknown>) {
  return {
    branches: asStringArray(config.branches),
    branchesIgnore: asStringArray(config["branches-ignore"]),
    tags: asStringArray(config.tags),
    tagsIgnore: asStringArray(config["tags-ignore"]),
    paths: asStringArray(config.paths),
    pathsIgnore: asStringArray(config["paths-ignore"]),
  };
}

function parsePullRequestConfig(config: Record<string, unknown>) {
  return {
    types: asStringArray(config.types),
    branches: asStringArray(config.branches),
    branchesIgnore: asStringArray(config["branches-ignore"]),
    paths: asStringArray(config.paths),
    pathsIgnore: asStringArray(config["paths-ignore"]),
  };
}

function parseSchedules(value: unknown): Array<{ cron: string; humanDescription: string }> {
  const entries = Array.isArray(value) ? value : [];
  const out: Array<{ cron: string; humanDescription: string }> = [];
  for (const entry of entries) {
    const cron = asString(asRecord(entry).cron);
    if (cron) out.push({ cron, humanDescription: `Cron ${cron}` });
  }
  return out;
}

function parseDispatchInputs(value: unknown): TriggerNodeData["workflowDispatchInputs"] {
  const inputs = asRecord(asRecord(value).inputs ?? value);
  const out: NonNullable<TriggerNodeData["workflowDispatchInputs"]> = [];
  for (const [name, raw] of Object.entries(inputs)) {
    const input = asRecord(raw);
    const type = asString(input.type);
    out.push({
      name,
      description: asString(input.description) ?? "",
      required: asBoolean(input.required) ?? false,
      type:
        type === "boolean" || type === "choice" || type === "environment" || type === "number"
          ? type
          : "string",
      default: asString(input.default),
      options: asStringArray(input.options),
    });
  }
  return out;
}

function parseWorkflowCall(value: unknown): TriggerNodeData["workflowCallConfig"] {
  const config = asRecord(value);
  const inputs: NonNullable<NonNullable<TriggerNodeData["workflowCallConfig"]>["inputs"]> = {};
  for (const [name, raw] of Object.entries(asRecord(config.inputs))) {
    const input = asRecord(raw);
    const type = asString(input.type);
    inputs[name] = {
      description: asString(input.description),
      required: asBoolean(input.required) ?? false,
      type: type === "boolean" || type === "number" ? type : "string",
      default: asString(input.default),
    };
  }
  const secrets: NonNullable<NonNullable<TriggerNodeData["workflowCallConfig"]>["secrets"]> = {};
  for (const [name, raw] of Object.entries(asRecord(config.secrets))) {
    const secret = asRecord(raw);
    secrets[name] = {
      description: asString(secret.description),
      required: asBoolean(secret.required) ?? false,
    };
  }
  const outputs: NonNullable<NonNullable<TriggerNodeData["workflowCallConfig"]>["outputs"]> = {};
  for (const [name, raw] of Object.entries(asRecord(config.outputs))) {
    const output = asRecord(raw);
    outputs[name] = {
      description: asString(output.description),
      value: asString(output.value) ?? "",
    };
  }
  return { inputs, secrets, outputs };
}

function parseTrigger(onValue: unknown): TriggerNodeData {
  const events: TriggerEvent[] = [];
  const trigger: TriggerNodeData = {
    id: "trigger",
    label: "Trigger",
    color: TRIGGER_COLOR,
    events,
    pushConfig: parsePushConfig({}),
    pullRequestConfig: parsePullRequestConfig({}),
    scheduleConfig: [],
    workflowDispatchInputs: [],
    workflowCallConfig: { inputs: {}, secrets: {}, outputs: {} },
  };

  const handleEvent = (event: string, config: unknown): void => {
    const normalized = normalizeEvent(event);
    if (!events.includes(normalized)) events.push(normalized);
    const record = asRecord(config);
    switch (normalized) {
      case "push":
        trigger.pushConfig = parsePushConfig(record);
        break;
      case "pull_request":
      case "pull_request_target":
        trigger.pullRequestConfig = parsePullRequestConfig(record);
        break;
      case "schedule":
        trigger.scheduleConfig = parseSchedules(config);
        break;
      case "workflow_dispatch":
        trigger.workflowDispatchInputs = parseDispatchInputs(config);
        break;
      case "workflow_call":
        trigger.workflowCallConfig = parseWorkflowCall(config);
        break;
      default:
        break;
    }
  };

  if (typeof onValue === "string") {
    handleEvent(onValue, null);
  } else if (Array.isArray(onValue)) {
    for (const entry of onValue) {
      if (typeof entry === "string") handleEvent(entry, null);
    }
  } else if (isRecord(onValue)) {
    for (const [event, config] of Object.entries(onValue)) handleEvent(event, config);
  }

  if (events.length === 0) events.push("push");
  return trigger;
}

// ---------------------------------------------------------------------------
// Job parsing
// ---------------------------------------------------------------------------

function parsePermissions(value: unknown): WorkflowPermissions | "read-all" | "write-all" | undefined {
  if (value === "read-all" || value === "write-all") return value;
  if (!isRecord(value)) return undefined;
  const out: WorkflowPermissions = {};
  for (const [scope, level] of Object.entries(value)) {
    if (level === "read" || level === "write" || level === "none") out[scope] = level;
  }
  return out;
}

function parseStrategy(value: unknown): JobNodeData["strategy"] {
  const strategy = asRecord(value);
  const matrix = asRecord(strategy.matrix);
  const axes: Array<{ key: string; values: string[] }> = [];
  const include: Array<Record<string, string>> = [];
  const exclude: Array<Record<string, string>> = [];

  for (const [key, raw] of Object.entries(matrix)) {
    if (key === "include") {
      for (const row of Array.isArray(raw) ? raw : []) include.push(asStringMap(row));
      continue;
    }
    if (key === "exclude") {
      for (const row of Array.isArray(raw) ? raw : []) exclude.push(asStringMap(row));
      continue;
    }
    axes.push({ key, values: asStringArray(raw) });
  }

  return {
    failFast: asBoolean(strategy["fail-fast"]) ?? true,
    maxParallel: asNumber(strategy["max-parallel"]),
    matrix: { axes, include, exclude },
  };
}

function parseStep(raw: unknown, jobId: string, index: number): StepItem | null {
  const step = asRecord(raw);
  const uses = asString(step.uses);
  const run = asString(step.run);
  if (!uses && !run) return null;

  const shell = asString(step.shell);
  return {
    id: `${STEP_PREFIX}-${jobId}-${index}`,
    stepId: asString(step.id),
    name: asString(step.name) ?? uses ?? (run ? run.split("\n")[0]?.slice(0, 60) : undefined),
    type: uses ? "action" : "run",
    disabled: asString(step.if)?.trim() === "false",
    ifCondition: asString(step.if),
    uses,
    run,
    shell,
    workingDirectory: asString(step["working-directory"]),
    with: asStringMap(step.with),
    env: asStringMap(step.env),
    continueOnError: asBoolean(step["continue-on-error"]),
    timeoutMinutes: asNumber(step["timeout-minutes"]),
  };
}

function parseSteps(value: unknown, jobId: string): StepItem[] {
  const list = Array.isArray(value) ? value : [];
  const steps: StepItem[] = [];
  list.forEach((raw, index) => {
    const step = parseStep(raw, jobId, index);
    if (step) steps.push(step);
  });
  return steps;
}

interface ParsedJob {
  jobId: string;
  job?: JobNodeData;
  reusable?: ReusableWorkflowNodeData;
}

function parseJob(jobId: string, raw: unknown): ParsedJob {
  const job = asRecord(raw);
  const uses = asString(job.uses);

  if (uses) {
    return {
      jobId,
      reusable: {
        jobId,
        name: asString(job.name) ?? jobId,
        uses,
        with: asStringMap(job.with),
        secrets: job.secrets === "inherit" ? "inherit" : asStringMap(job.secrets),
        ifCondition: asString(job.if),
        permissions: parsePermissions(job.permissions),
      },
    };
  }

  const environment = job.environment;
  const parsedEnvironment =
    typeof environment === "string"
      ? environment
      : isRecord(environment)
        ? { name: asString(environment.name) ?? "", url: asString(environment.url) }
        : undefined;

  const services: ServiceConfig[] = [];
  for (const [name, config] of Object.entries(asRecord(job.services))) {
    const service = asRecord(config);
    const image = asString(service.image);
    if (!image) continue;
    services.push({
      serviceId: name,
      image,
      env: asStringMap(service.env),
      ports: asStringArray(service.ports),
      volumes: asStringArray(service.volumes),
      options: asString(service.options),
    });
  }

  const containerRaw = job.container;
  const container =
    typeof containerRaw === "string"
      ? containerRaw
      : isRecord(containerRaw) && typeof containerRaw.image === "string"
        ? { ...containerRaw, image: containerRaw.image }
        : undefined;

  return {
    jobId,
    job: {
      jobId,
      name: asString(job.name) ?? jobId,
      runsOn: asRunsOn(job["runs-on"]),
      ifCondition: asString(job.if),
      environment: parsedEnvironment as JobNodeData["environment"],
      timeoutMinutes: asNumber(job["timeout-minutes"]),
      continueOnError: asBoolean(job["continue-on-error"]),
      env: asStringMap(job.env),
      outputs: asStringMap(job.outputs),
      permissions: parsePermissions(job.permissions),
      strategy: parseStrategy(job.strategy),
      container: container as JobNodeData["container"],
      services,
      steps: parseSteps(job.steps, jobId),
    },
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const TRIGGER_POSITION = { x: 80, y: 240 };
const JOB_COLUMN_X = 440;
const JOB_ROW_HEIGHT = 200;
const JOB_ROW_START_Y = 80;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseYamlToGraph(yamlString: string, _options: ParseOptions = {}): ParseResult {
  const document = parseDocument(yamlString, { prettyErrors: true });

  if (document.errors.length > 0) {
    const first = document.errors[0];
    const line = first?.linePos?.[0]?.line ?? null;
    return {
      success: false,
      graph: null,
      error: first?.message ?? "Invalid YAML",
      errorLine: line ?? null,
    };
  }

  const root = asRecord(document.toJS());
  if (Object.keys(root).length === 0) {
    return { success: false, graph: null, error: "The YAML document is empty", errorLine: null };
  }

  const jobsRaw = asRecord(root.jobs);
  if (Object.keys(jobsRaw).length === 0) {
    return {
      success: false,
      graph: null,
      error: "No jobs found: the `jobs` key is required",
      errorLine: null,
    };
  }

  const trigger = parseTrigger(root.on ?? root.true);
  const triggerNode: GraphNode = {
    id: "trigger",
    type: "trigger",
    position: { ...TRIGGER_POSITION },
    data: {
      id: "trigger",
      label: trigger.label ?? "Trigger",
      color: TRIGGER_COLOR,
      trigger,
    },
  };

  const nodes: GraphNode[] = [triggerNode];
  const edges: ReactFlowEdge[] = [];
  const parsedJobs: ParsedJob[] = [];

  let index = 0;
  for (const [jobId, raw] of Object.entries(jobsRaw)) {
    const parsed = parseJob(jobId, raw);
    parsedJobs.push(parsed);

    const position = { x: JOB_COLUMN_X, y: JOB_ROW_START_Y + index * JOB_ROW_HEIGHT };
    index += 1;

    const data: GraphNodeData = parsed.job
      ? {
          id: jobId,
          label: parsed.job.name ?? jobId,
          color: JOB_COLOR,
          job: parsed.job,
        }
      : {
          id: jobId,
          label: parsed.reusable?.name ?? jobId,
          color: REUSABLE_COLOR,
          reusableWorkflow: parsed.reusable,
        };

    nodes.push({
      id: jobId,
      type: parsed.job ? "job" : "reusable_workflow",
      position,
      data,
    });
  }

  // Dependencies: explicit `needs` first, then every root job follows the trigger.
  const jobIds = new Set(parsedJobs.map((parsed) => parsed.jobId));
  const hasIncoming = new Set<string>();

  for (const parsed of parsedJobs) {
    const needsRaw = asRecord(jobsRaw[parsed.jobId]).needs;
    const needs = typeof needsRaw === "string" ? [needsRaw] : asStringArray(needsRaw);
    for (const need of needs) {
      if (!jobIds.has(need)) continue;
      hasIncoming.add(parsed.jobId);
      edges.push({
        id: `edge-${need}-${parsed.jobId}`,
        source: need,
        target: parsed.jobId,
        sourceHandle: "job-out",
        targetHandle: "job-in",
        type: "dependency",
      });
    }
  }

  for (const parsed of parsedJobs) {
    if (hasIncoming.has(parsed.jobId)) continue;
    edges.push({
      id: `edge-trigger-${parsed.jobId}`,
      source: "trigger",
      target: parsed.jobId,
      sourceHandle: "trigger-out",
      targetHandle: "job-in",
      type: "dependency",
    });
  }

  const globalSettings: WorkflowGlobalSettings = {
    name: asString(root.name) ?? "Workflow",
    runName: asString(root["run-name"]),
    env: asStringMap(root.env),
    permissions: parsePermissions(root.permissions),
    concurrency: isRecord(root.concurrency)
      ? {
          group: asString(root.concurrency.group) ?? "",
          cancelInProgress: asBoolean(root.concurrency["cancel-in-progress"]) ?? false,
        }
      : asString(root.concurrency),
    defaults: isRecord(root.defaults)
      ? {
          run: {
            shell: asString(asRecord(root.defaults.run).shell),
            workingDirectory: asString(asRecord(root.defaults.run)["working-directory"]),
          },
        }
      : undefined,
  };

  return {
    success: true,
    graph: {
      name: globalSettings.name,
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 },
      globalSettings,
      version: 1,
    },
    error: null,
    errorLine: null,
  };
}
