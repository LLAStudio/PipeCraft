// ---------------------------------------------------------------------------
// PipeCraft — shared pipeline domain types
//
// These types are the contract between the YAML compiler, the canvas, the
// validators, the inspectors and the Zustand store.
// ---------------------------------------------------------------------------

/** GitHub Actions workflow trigger events we support in the UI. */
export type TriggerEvent =
  | "push"
  | "pull_request"
  | "pull_request_target"
  | "schedule"
  | "workflow_dispatch"
  | "workflow_call"
  | "workflow_run"
  | "release"
  | "issues"
  | "issue_comment"
  | "create"
  | "delete"
  | "fork"
  | "gollum"
  | "label"
  | "milestone"
  | "page_build"
  | "public"
  | "registry_package"
  | "repository_dispatch"
  | "status"
  | "watch"
  | "merge_group"
  | "deployment"
  | "deployment_status"
  | "discussion"
  | "discussion_comment";

export type PermissionLevel = "read" | "write" | "none";

export interface WorkflowPermissions {
  actions?: PermissionLevel | undefined;
  checks?: PermissionLevel | undefined;
  contents?: PermissionLevel | undefined;
  deployments?: PermissionLevel | undefined;
  discussions?: PermissionLevel | undefined;
  "id-token"?: PermissionLevel | undefined;
  idToken?: PermissionLevel | undefined;
  issues?: PermissionLevel | undefined;
  packages?: PermissionLevel | undefined;
  pages?: PermissionLevel | undefined;
  "pull-requests"?: PermissionLevel | undefined;
  pullRequests?: PermissionLevel | undefined;
  "repository-projects"?: PermissionLevel | undefined;
  "security-events"?: PermissionLevel | undefined;
  securityEvents?: PermissionLevel | undefined;
  statuses?: PermissionLevel | undefined;
  [scope: string]: PermissionLevel | undefined;
}

export type WorkflowPermissionPreset = "read-all" | "write-all";

export interface ConcurrencyConfig {
  group: string;
  cancelInProgress?: boolean | undefined;
}

export interface DefaultsConfig {
  run?: {
    shell?: string | undefined;
    workingDirectory?: string | undefined;
  } | undefined;
}

export interface WorkflowGlobalSettings {
  name: string;
  runName?: string | undefined;
  env: Record<string, string>;
  permissions?: WorkflowPermissions | WorkflowPermissionPreset | undefined;
  concurrency?: ConcurrencyConfig | string | undefined;
  defaults?: DefaultsConfig | undefined;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export interface ActionInputMetadata {
  description?: string | undefined;
  required?: boolean | undefined;
  default?: string | undefined;
  deprecationMessage?: string | undefined;
  type?: string | undefined;
  options?: string[] | undefined;
}

export interface ActionMetadata {
  name?: string | undefined;
  description?: string | undefined;
  author?: string | undefined;
  version?: string | undefined;
  repo?: string | undefined;
  stars?: number | undefined;
  inputs?: Record<string, ActionInputMetadata> | undefined;
  outputs?: Record<string, { description?: string | undefined }> | undefined;
  branding?: { icon?: string | undefined; color?: string | undefined } | undefined;
}

export type ShellName = "bash" | "sh" | "pwsh" | "python" | "cmd" | "powershell";

export interface StepItem {
  id: string;
  stepId?: string | undefined;
  name?: string | undefined;
  type?: "action" | "run" | undefined;
  uses?: string | undefined;
  run?: string | undefined;
  with?: Record<string, string> | undefined;
  env?: Record<string, string> | undefined;
  shell?: ShellName | string | undefined;
  workingDirectory?: string | undefined;
  ifCondition?: string | undefined;
  continueOnError?: boolean | undefined;
  timeoutMinutes?: number | undefined;
  disabled?: boolean | undefined;
  metadata?: ActionMetadata | undefined;
  actionMetadata?: ActionMetadata | undefined;
}

/** Backwards-compatible alias used by older canvas code. */
export type StepData = StepItem;

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface MatrixConfig {
  axes: Array<{ key: string; values: string[] }>;
  include: Array<Record<string, string>>;
  exclude: Array<Record<string, string>>;
}

export interface StrategyConfig {
  failFast: boolean;
  maxParallel?: number | undefined;
  matrix: MatrixConfig;
}

export interface ContainerConfig {
  image: string;
  credentials?: { username: string; password: string } | undefined;
  env?: Record<string, string> | undefined;
  ports?: string[] | undefined;
  volumes?: string[] | undefined;
  options?: string | undefined;
}

/** A service container attached to a job (rendered as an editable list). */
export interface ServiceConfig extends ContainerConfig {
  serviceId: string;
}

export type LiveStatus =
  | "queued"
  | "in_progress"
  | "completed_success"
  | "completed_failure"
  | "cancelled"
  | "skipped";

export interface JobNodeData {
  id?: string | undefined;
  jobId: string;
  name?: string | undefined;
  label?: string | undefined;
  color?: string | undefined;
  runsOn: string | string[];
  steps: StepItem[];
  needs?: string[] | undefined;
  ifCondition?: string | undefined;
  environment?: { name: string; url?: string | undefined } | undefined;
  timeoutMinutes?: number | undefined;
  continueOnError?: boolean | undefined;
  env: Record<string, string>;
  permissions?: WorkflowPermissions | WorkflowPermissionPreset | undefined;
  outputs: Record<string, string>;
  strategy: StrategyConfig;
  container?: ContainerConfig | undefined;
  services: ServiceConfig[];
  liveStatus?: LiveStatus | undefined;
  liveDurationSeconds?: number | undefined;
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export interface PushConfig {
  branches: string[];
  branchesIgnore: string[];
  tags: string[];
  tagsIgnore: string[];
  paths: string[];
  pathsIgnore: string[];
}

export interface PullRequestConfig {
  types: string[];
  branches: string[];
  branchesIgnore: string[];
  paths: string[];
  pathsIgnore: string[];
}

export interface ScheduleEntry {
  cron: string;
  humanDescription: string;
}

export interface WorkflowDispatchInput {
  name: string;
  description: string;
  required: boolean;
  type: "string" | "boolean" | "choice" | "environment" | "number";
  default?: string | undefined;
  options?: string[] | undefined;
}

export interface WorkflowCallConfig {
  inputs: Record<string, { description?: string | undefined; required?: boolean | undefined; type: "string" | "boolean" | "number"; default?: string | undefined }>;
  secrets: Record<string, { description?: string | undefined; required?: boolean | undefined }>;
  outputs: Record<string, { description?: string | undefined; value: string }>;
}

export interface TriggerNodeData {
  id?: string | undefined;
  label?: string | undefined;
  color?: string | undefined;
  events: TriggerEvent[];
  pushConfig: PushConfig;
  pullRequestConfig: PullRequestConfig;
  scheduleConfig: ScheduleEntry[];
  workflowDispatchInputs: WorkflowDispatchInput[];
  workflowCallConfig: WorkflowCallConfig;
}

// ---------------------------------------------------------------------------
// Reusable workflows
// ---------------------------------------------------------------------------

export interface ReusableWorkflowNodeData {
  id?: string | undefined;
  jobId?: string | undefined;
  name?: string | undefined;
  label?: string | undefined;
  color?: string | undefined;
  uses: string;
  with: Record<string, string>;
  secrets: Record<string, string> | "inherit";
  needs?: string[] | undefined;
  ifCondition?: string | undefined;
  permissions?: WorkflowPermissions | WorkflowPermissionPreset | undefined;
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export interface ConditionData {
  expression?: string | undefined;
  label?: string | undefined;
}

/**
 * Payload carried by every canvas node. A node carries exactly one of the
 * domain payloads, which keeps the YAML compiler and the inspectors in sync.
 */
export interface GraphNodeData {
  id?: string | undefined;
  label?: string | undefined;
  color?: string | undefined;
  description?: string | undefined;
  trigger?: TriggerNodeData | undefined;
  job?: JobNodeData | undefined;
  step?: StepItem | undefined;
  reusableWorkflow?: ReusableWorkflowNodeData | undefined;
  condition?: ConditionData | undefined;
}

export type NodeData = GraphNodeData;

export interface XYPosition {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  type: string;
  position: XYPosition;
  data: GraphNodeData;
  parentId?: string | undefined;
  extent?: "parent" | undefined;
  width?: number | undefined;
  height?: number | undefined;
  selected?: boolean | undefined;
  dragging?: boolean | undefined;
  hidden?: boolean | undefined;
  draggable?: boolean | undefined;
  selectable?: boolean | undefined;
  className?: string | undefined;
  zIndex?: number | undefined;
  expandParent?: boolean | undefined;
  initialWidth?: number | undefined;
  initialHeight?: number | undefined;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
  type?: string | undefined;
  label?: string | undefined;
  animated?: boolean | undefined;
  className?: string | undefined;
  selected?: boolean | undefined;
  data?: Record<string, unknown> | undefined;
  style?: Record<string, unknown> | undefined;
  markerEnd?: unknown;
  markerStart?: unknown;
  zIndex?: number | undefined;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface SerializedGraph {
  version?: number | undefined;
  name?: string | undefined;
  description?: string | undefined;
  nodes: GraphNode[];
  edges: ReactFlowEdge[];
  viewport: Viewport;
  globalSettings: WorkflowGlobalSettings;
}

// ---------------------------------------------------------------------------
// Validation & security
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationError {
  severity: ValidationSeverity;
  code: string;
  message: string;
  nodeId?: string | undefined;
  stepIndex?: number | undefined;
  field?: string | undefined;
  autoFix?: (() => void) | undefined;
}

export interface GraphValidationSummary {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  errors: ValidationError[];
}

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "warning" | "info";

export interface SecurityAlert {
  rule: string;
  severity: SecuritySeverity;
  pointsDeducted: number;
  message: string;
  nodeId?: string | undefined;
  stepIndex?: number | undefined;
  autoFix?: (() => void) | undefined;
  autoFixDescription?: string | undefined;
}

export interface SecurityLintResult {
  score: number;
  alerts: SecurityAlert[];
}

// ---------------------------------------------------------------------------
// FinOps
// ---------------------------------------------------------------------------

export type RunnerPlatform = "linux" | "windows" | "macos" | "self-hosted";

export interface FinOpsMatrixBreakdownRow {
  jobId: string;
  name: string;
  multiplier: number;
  instances: number;
  estimatedMinutes: number;
  platform: RunnerPlatform;
}

export interface FinOpsEstimate {
  totalMinutes: number;
  linuxMinutes: number;
  windowsMinutes: number;
  macosMinutes: number;
  selfHostedMinutes: number;
  costInCents: number;
  matrixBreakdown: FinOpsMatrixBreakdownRow[];
}
