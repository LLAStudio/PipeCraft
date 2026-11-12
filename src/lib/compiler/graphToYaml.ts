import { stringify } from "yaml";
import type {
  GraphNode,
  JobNodeData,
  ReactFlowEdge,
  ReusableWorkflowNodeData,
  ServiceConfig,
  StepItem,
  TriggerNodeData,
  Viewport,
  WorkflowGlobalSettings,
} from "@/types/pipeline";

export interface GraphToYamlInput {
  nodes: GraphNode[];
  edges: ReactFlowEdge[];
  globalSettings?: WorkflowGlobalSettings | undefined;
  viewport?: Viewport | undefined;
}

export interface GraphToYamlOptions {
  keepDisabledStepsAsComments?: boolean;
  indentSize?: number;
  lineWidth?: number;
}

type YamlObject = Record<string, unknown>;

const EMPTY: unique symbol = Symbol("empty");

/** Drop undefined / null / empty collections so YAML stays tidy. */
function compact(input: YamlObject): YamlObject {
  const out: YamlObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    out[key] = value;
  }
  return out;
}

function cleanList(values: readonly string[] | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter((v) => v.length > 0);
}

function jobIdOf(node: GraphNode): string {
  return node.data.job?.jobId ?? node.data.reusableWorkflow?.jobId ?? node.id;
}

// ---------------------------------------------------------------------------
// Trigger (on:)
// ---------------------------------------------------------------------------

function pushSection(trigger: TriggerNodeData): YamlObject | null {
  const config = trigger.pushConfig;
  if (!config) return null;
  return compact({
    branches: cleanList(config.branches),
    "branches-ignore": cleanList(config.branchesIgnore),
    tags: cleanList(config.tags),
    "tags-ignore": cleanList(config.tagsIgnore),
    paths: cleanList(config.paths),
    "paths-ignore": cleanList(config.pathsIgnore),
  });
}

function pullRequestSection(trigger: TriggerNodeData): YamlObject | null {
  const config = trigger.pullRequestConfig;
  if (!config) return null;
  return compact({
    types: cleanList(config.types),
    branches: cleanList(config.branches),
    "branches-ignore": cleanList(config.branchesIgnore),
    paths: cleanList(config.paths),
    "paths-ignore": cleanList(config.pathsIgnore),
  });
}

function scheduleSection(trigger: TriggerNodeData): YamlObject[] | null {
  const entries = trigger.scheduleConfig ?? [];
  const crons = entries.map((entry) => entry.cron.trim()).filter((cron) => cron.length > 0);
  if (crons.length === 0) return null;
  return crons.map((cron) => ({ cron }));
}

function dispatchSection(trigger: TriggerNodeData): YamlObject | null {
  const inputs = trigger.workflowDispatchInputs ?? [];
  if (inputs.length === 0) return null;
  const map: YamlObject = {};
  for (const input of inputs) {
    if (!input.name) continue;
    map[input.name] = compact({
      description: input.description,
      required: input.required ? true : undefined,
      type: input.type !== "string" ? input.type : undefined,
      default: input.default,
      options: cleanList(input.options),
    });
  }
  return Object.keys(map).length > 0 ? { inputs: map } : null;
}

function workflowCallSection(trigger: TriggerNodeData): YamlObject | null {
  const config = trigger.workflowCallConfig;
  if (!config) return null;
  const inputs: YamlObject = {};
  for (const [name, input] of Object.entries(config.inputs ?? {})) {
    inputs[name] = compact({
      description: input.description,
      required: input.required ? true : undefined,
      type: input.type,
      default: input.default,
    });
  }
  const secrets: YamlObject = {};
  for (const [name, secret] of Object.entries(config.secrets ?? {})) {
    secrets[name] = compact({
      description: secret.description,
      required: secret.required ? true : undefined,
    });
  }
  const outputs: YamlObject = {};
  for (const [name, output] of Object.entries(config.outputs ?? {})) {
    outputs[name] = compact({ description: output.description, value: output.value });
  }
  return compact({ inputs, secrets, outputs });
}

function eventConfig(event: string, trigger: TriggerNodeData): unknown {
  switch (event) {
    case "push":
      return pushSection(trigger);
    case "pull_request":
    case "pull_request_target":
      return pullRequestSection(trigger);
    case "schedule":
      return scheduleSection(trigger);
    case "workflow_dispatch":
      return dispatchSection(trigger);
    case "workflow_call":
      return workflowCallSection(trigger);
    default:
      return null;
  }
}

function buildOnSection(trigger: TriggerNodeData | undefined): unknown {
  const events = cleanList(trigger?.events ?? []);
  const normalized = events.length > 0 ? events : ["push"];
  if (normalized.length === 1) {
    const event = normalized[0] as string;
    const config = trigger ? eventConfig(event, trigger) : null;
    if (config === null || config === EMPTY) return event;
    return { [event]: config };
  }
  const section: YamlObject = {};
  for (const event of normalized) {
    const config = trigger ? eventConfig(event, trigger) : null;
    section[event] = config;
  }
  return section;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function stepToObject(step: StepItem, keepDisabledAsComment: boolean): YamlObject | null {
  if (!step.uses && !step.run) return null;
  if (step.disabled && keepDisabledAsComment) return null;

  const condition = step.disabled ? "false" : step.ifCondition;

  return compact({
    name: step.name,
    id: step.stepId && step.stepId !== step.id ? step.stepId : undefined,
    if: condition,
    uses: step.uses,
    run: step.run,
    shell: step.shell,
    "working-directory": step.workingDirectory,
    with: step.with,
    env: step.env,
    "continue-on-error": step.continueOnError,
    "timeout-minutes": step.timeoutMinutes,
  });
}

function stepsToArray(steps: readonly StepItem[] | undefined, keepDisabledAsComment: boolean): YamlObject[] | null {
  const out: YamlObject[] = [];
  for (const step of steps ?? []) {
    const serialized = stepToObject(step, keepDisabledAsComment);
    if (serialized) out.push(serialized);
  }
  return out.length > 0 ? out : null;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

function servicesToObject(services: readonly ServiceConfig[]): YamlObject | null {
  const out: YamlObject = {};
  for (const service of services) {
    if (!service.serviceId || !service.image) continue;
    out[service.serviceId] = compact({
      image: service.image,
      credentials: service.credentials,
      env: service.env,
      ports: service.ports,
      volumes: service.volumes,
      options: service.options,
    });
  }
  return Object.keys(out).length > 0 ? out : null;
}

function matrixToObject(job: JobNodeData): YamlObject | null {
  const strategy = job.strategy;
  if (!strategy) return null;
  const axes = strategy.matrix?.axes ?? [];
  const matrix: YamlObject = {};
  for (const axis of axes) {
    const values = cleanList(axis.values);
    if (axis.key && values.length > 0) matrix[axis.key] = values;
  }
  const include = (strategy.matrix?.include ?? []).filter((row) => Object.keys(row).length > 0);
  const exclude = (strategy.matrix?.exclude ?? []).filter((row) => Object.keys(row).length > 0);
  if (include.length > 0) matrix.include = include;
  if (exclude.length > 0) matrix.exclude = exclude;

  return compact({
    "fail-fast": strategy.failFast === false ? false : undefined,
    "max-parallel": strategy.maxParallel,
    matrix: Object.keys(matrix).length > 0 ? matrix : undefined,
  });
}

function jobToObject(job: JobNodeData, needs: string[], keepDisabledAsComment: boolean): YamlObject {
  return compact({
    name: job.name && job.name !== job.jobId ? job.name : undefined,
    needs: needs.length > 0 ? needs : undefined,
    if: job.ifCondition,
    "runs-on": job.runsOn,
    environment: job.environment,
    "timeout-minutes": job.timeoutMinutes,
    "continue-on-error": job.continueOnError,
    permissions: job.permissions,
    env: job.env,
    outputs: job.outputs,
    strategy: matrixToObject(job),
    container: job.container,
    services: servicesToObject(job.services),
    steps: stepsToArray(job.steps, keepDisabledAsComment),
  });
}

function reusableToObject(workflow: ReusableWorkflowNodeData, needs: string[]): YamlObject {
  return compact({
    name: workflow.name && workflow.name !== workflow.jobId ? workflow.name : undefined,
    needs: needs.length > 0 ? needs : undefined,
    if: workflow.ifCondition,
    uses: workflow.uses,
    with: workflow.with,
    secrets: workflow.secrets,
    permissions: workflow.permissions,
  });
}

function globalSection(settings: WorkflowGlobalSettings | undefined): YamlObject {
  if (!settings) return {};
  const permissions =
    settings.permissions === "read-all" || settings.permissions === "write-all"
      ? settings.permissions
      : compact({ ...(settings.permissions ?? {}) });

  return compact({
    permissions,
    env: settings.env,
    concurrency: settings.concurrency,
    defaults: settings.defaults,
  });
}

// ---------------------------------------------------------------------------
// Graph traversal helpers
// ---------------------------------------------------------------------------

const JOB_NODE_TYPES = new Set(["job", "reusable_workflow"]);

function isJobNode(node: GraphNode): boolean {
  return JOB_NODE_TYPES.has(node.type) || Boolean(node.data.job) || Boolean(node.data.reusableWorkflow);
}

/** Kahn topological sort of the job graph; cyclic nodes are appended last. */
export function topologicalSortJobs(nodes: GraphNode[], edges: ReactFlowEdge[]): GraphNode[] {
  const jobNodes = nodes.filter(isJobNode);
  const byId = new Map(jobNodes.map((node) => [node.id, node] as const));
  const incoming = new Map<string, Set<string>>();
  for (const node of jobNodes) incoming.set(node.id, new Set());

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    incoming.get(edge.target)?.add(edge.source);
  }

  const sorted: GraphNode[] = [];
  const remaining = new Map(incoming);
  while (remaining.size > 0) {
    const ready = [...remaining.entries()]
      .filter(([, deps]) => [...deps].every((dep) => !remaining.has(dep)))
      .map(([id]) => id);

    // Break cycles deterministically instead of looping forever.
    const batch = ready.length > 0 ? ready : [[...remaining.keys()][0] as string];

    for (const id of batch) {
      const node = byId.get(id);
      if (node) sorted.push(node);
      remaining.delete(id);
    }
  }

  return sorted;
}

function needsFor(node: GraphNode, edges: ReactFlowEdge[], nodes: GraphNode[]): string[] {
  const byId = new Map(nodes.map((candidate) => [candidate.id, candidate] as const));
  const needs: string[] = [];
  for (const edge of edges) {
    if (edge.target !== node.id) continue;
    const source = byId.get(edge.source);
    if (!source || !isJobNode(source)) continue;
    const id = jobIdOf(source);
    if (id && !needs.includes(id)) needs.push(id);
  }
  return needs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function graphToYaml(input: GraphToYamlInput, options: GraphToYamlOptions = {}): string {
  const nodes = input.nodes ?? [];
  const edges = input.edges ?? [];
  const keepDisabledAsComment = options.keepDisabledStepsAsComments ?? false;

  const triggerNode = nodes.find((node) => node.type === "trigger" || node.data.trigger);
  const trigger = triggerNode?.data.trigger;

  const jobs: YamlObject = {};
  for (const node of topologicalSortJobs(nodes, edges)) {
    const needs = needsFor(node, edges, nodes);
    if (node.data.job) {
      jobs[jobIdOf(node)] = jobToObject(node.data.job, needs, keepDisabledAsComment);
    } else if (node.data.reusableWorkflow) {
      jobs[jobIdOf(node)] = reusableToObject(node.data.reusableWorkflow, needs);
    }
  }

  const document = compact({
    name: input.globalSettings?.name,
    "run-name": input.globalSettings?.runName,
    on: buildOnSection(trigger),
    ...globalSection(input.globalSettings),
    jobs: Object.keys(jobs).length > 0 ? jobs : undefined,
  });

  return `${stringify(document, {
    lineWidth: options.lineWidth ?? 0,
    indent: options.indentSize ?? 2,
    defaultKeyType: "PLAIN",
    defaultStringType: "PLAIN",
  })}\n`;
}
