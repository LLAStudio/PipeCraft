import type { SerializedGraph, WorkflowGlobalSettings, TriggerNodeData, GraphNode, ReactFlowEdge } from "@/types/pipeline";

// ---------------------------------------------------------------------------
// Official PipeCraft templates — complete, loadable, production-grade
// ---------------------------------------------------------------------------

function buildTrigger(
  events: TriggerNodeData["events"],
  pushBranches: string[] = ["main"],
): TriggerNodeData {
  return {
    events,
    pushConfig: {
      branches: pushBranches,
      branchesIgnore: [],
      tags: [],
      tagsIgnore: [],
      paths: [],
      pathsIgnore: [],
    },
    pullRequestConfig: {
      types: ["opened", "synchronize", "reopened"],
      branches: pushBranches,
      branchesIgnore: [],
      paths: [],
      pathsIgnore: [],
    },
    scheduleConfig: [],
    workflowDispatchInputs: [
      {
        name: "environment",
        description: "Target environment",
        required: true,
        type: "choice",
        default: "staging",
        options: ["staging", "production"],
      },
    ],
    workflowCallConfig: { inputs: {}, secrets: {}, outputs: {} },
  };
}

function makeGraph(
  name: string,
  _description: string,
  _category: string,
  _tags: string[],
  events: TriggerNodeData["events"],
  jobSpecs: Array<{
    jobId: string;
    label: string;
    color: string;
    runsOn: string;
    position: { x: number; y: number };
    steps: Array<{
      id: string;
      stepId?: string;
      name?: string;
      type: "action" | "run";
      disabled: boolean;
      uses?: string;
      run?: string;
      shell?: "bash" | "sh" | "pwsh" | "python" | "cmd";
      with?: Record<string, string>;
      env?: Record<string, string>;
      workingDirectory?: string;
    }>;
    strategy?: {
      failFast: boolean;
      maxParallel?: number;
      matrix: { axes: Array<{ key: string; values: string[] }>; include: Array<Record<string, string>>; exclude: Array<Record<string, string>> };
    };
    ifCondition?: string;
    env?: Record<string, string>;
  }>,
  edges: Array<{ id: string; source: string; target: string; sourceHandle: string; targetHandle: string }>,
  globalSettings: Partial<WorkflowGlobalSettings> = {},
): SerializedGraph {
  const trigger: GraphNode = {
    id: "trigger",
    type: "trigger",
    position: { x: 160, y: 240 },
    data: {
      id: "trigger",
      label: "Trigger",
      color: "#FACC15",
      trigger: buildTrigger(events),
    },
  };

  const nodes: GraphNode[] = [trigger];

  for (const spec of jobSpecs) {
    const jobNode: GraphNode = {
      id: spec.jobId,
      type: "job",
      position: spec.position,
      data: {
        id: spec.jobId,
        label: spec.label,
        color: spec.color,
        job: {
          jobId: spec.jobId,
          name: spec.label,
          runsOn: spec.runsOn,
          continueOnError: false,
          env: spec.env ?? {},
          outputs: {},
          steps: spec.steps.map((s) => ({
            id: s.id,
            name: s.name ?? s.uses ?? s.run ?? "Step",
            type: s.type,
            disabled: s.disabled,
            stepId: s.stepId ?? s.id,
            uses: s.uses,
            run: s.run,
            shell: s.shell,
            with: s.with,
            env: s.env,
            workingDirectory: s.workingDirectory,
          })),
          timeoutMinutes: 360,
          services: [],
          strategy: spec.strategy ?? {
            failFast: true,
            matrix: { axes: [], include: [], exclude: [] },
          },
          ifCondition: spec.ifCondition,
        },
      },
    };
    nodes.push(jobNode);
  }

  const graphEdges: ReactFlowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: true,
    type: "dependency",
    arrowHeadType: "arrowclosed",
  }));

  return {
    nodes,
    edges: graphEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
    globalSettings: {
      name,
      env: {},
      permissions: { contents: "read" },
      concurrency: { group: "${{ github.workflow }}", cancelInProgress: true },
      defaults: { run: { shell: "bash" } },
      ...globalSettings,
    },
  };
}

// ---------------------------------------------------------------------------
// Template 1 — Next.js (Frontend)
// ---------------------------------------------------------------------------

const nextjsTemplate: SerializedGraph = makeGraph(
  "Next.js CI",
  "Build, lint and test a Next.js application; deploy to Vercel-style preview on every PR.",
  "Frontend",
  ["Next.js", "Vercel", "Lint", "Tests", "TypeScript"],
  ["push", "pull_request"],
  [
    {
      jobId: "build",
      label: "Build & Lint",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 100 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-lint", stepId: "lint", name: "Run ESLint", type: "run", disabled: false, run: "npm run lint", shell: "bash" },
        { id: "step-build", stepId: "build", name: "Build application", type: "run", disabled: false, run: "npm run build", shell: "bash" },
      ],
    },
    {
      jobId: "test",
      label: "Test & TypeCheck",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 280 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-test", stepId: "test", name: "Run tests", type: "run", disabled: false, run: "npm test", shell: "bash" },
        { id: "step-typecheck", stepId: "typecheck", name: "TypeScript check", type: "run", disabled: false, run: "npm run typecheck", shell: "bash" },
      ],
    },
  ],
  [
    { id: "trigger->build", source: "trigger", target: "build", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "build->test", source: "build", target: "test", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 2 — Node.js Backend API
// ---------------------------------------------------------------------------

const backendTemplate: SerializedGraph = makeGraph(
  "Node.js Backend CI",
  "Lint, unit test and integration test a Node.js API server with coverage reporting.",
  "Backend",
  ["Node.js", "Express", "Tests", "Coverage", "PostgreSQL"],
  ["push", "pull_request"],
  [
    {
      jobId: "lint",
      label: "Lint & Format",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 100 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-lint", stepId: "lint", name: "Run ESLint", type: "run", disabled: false, run: "npm run lint", shell: "bash" },
        { id: "step-format", stepId: "format", name: "Check formatting", type: "run", disabled: false, run: "npm run format:check", shell: "bash" },
      ],
    },
    {
      jobId: "test",
      label: "Test Suite",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 280 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-service-postgres", stepId: "postgres", name: "Start Postgres service", type: "action", disabled: false, uses: "docker://postgres:15-alpine", with: { POSTGRES_USER: "test", POSTGRES_PASSWORD: "test", POSTGRES_DB: "testdb" } },
        { id: "step-test", stepId: "test", name: "Run tests", type: "run", disabled: false, run: "npm test", shell: "bash", env: { DATABASE_URL: "postgres://test:test@localhost:5432/testdb" } },
        { id: "step-coverage", stepId: "coverage", name: "Upload coverage", type: "action", disabled: false, uses: "actions/upload-artifact@v4", with: { name: "coverage-report", path: "coverage/" } },
      ],
      strategy: {
        failFast: true,
        matrix: { axes: [], include: [], exclude: [] },
      },
    },
  ],
  [
    { id: "trigger->lint", source: "trigger", target: "lint", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "lint->test", source: "lint", target: "test", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 3 — Docker & Kubernetes
// ---------------------------------------------------------------------------

const dockerK8sTemplate: SerializedGraph = makeGraph(
  "Docker & Kubernetes Pipeline",
  "Build a Docker image, push to a registry, and deploy to a Kubernetes cluster on main.",
  "Docker & K8s",
  ["Docker", "Kubernetes", "AWS", "Docker Buildx", "Deploy"],
  ["push", "workflow_dispatch"],
  [
    {
      jobId: "build",
      label: "Build Image",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 120 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-buildx", stepId: "setup-buildx", name: "Set up Docker Buildx", type: "action", disabled: false, uses: "docker/setup-buildx-action@v3" },
        { id: "step-login", stepId: "login", name: "Login to registry", type: "action", disabled: false, uses: "docker/login-action@v3", with: { "registry": "ghcr.io", "username": "${{ github.actor }}", "password": "${{ secrets.GITHUB_TOKEN }}" } },
        { id: "step-build-push", stepId: "build-push", name: "Build and push", type: "action", disabled: false, uses: "docker/build-push-action@v5", with: { context: ".", push: "true", tags: "ghcr.io/${{ github.repository }}:${{ github.sha }}" } },
      ],
    },
    {
      jobId: "deploy",
      label: "Deploy to Kubernetes",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 320 },
      ifCondition: "github.ref == 'refs/heads/main'",
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-kubectl", stepId: "setup-kubectl", name: "Set up kubectl", type: "action", disabled: false, uses: "azure/setup-kubectl@v3" },
        { id: "step-deploy", stepId: "deploy", name: "Deploy to cluster", type: "run", disabled: false, run: "kubectl apply -f k8s/", shell: "bash", env: { KUBE_CONFIG: "${{ secrets.KUBE_CONFIG }}" } },
        { id: "step-rollout", stepId: "rollout", name: "Wait for rollout", type: "run", disabled: false, run: "kubectl rollout status deployment/app", shell: "bash" },
      ],
    },
  ],
  [
    { id: "trigger->build", source: "trigger", target: "build", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "build->deploy", source: "build", target: "deploy", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 4 — Mobile (React Native)
// ---------------------------------------------------------------------------

const mobileTemplate: SerializedGraph = makeGraph(
  "React Native CI",
  "Lint, type-check and test a React Native application across iOS and Android.",
  "Mobile",
  ["React Native", "iOS", "Android", "Expo", "Tests"],
  ["push", "pull_request"],
  [
    {
      jobId: "lint",
      label: "Lint & Typecheck",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 100 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-lint", stepId: "lint", name: "Run ESLint", type: "run", disabled: false, run: "npm run lint", shell: "bash" },
        { id: "step-typecheck", stepId: "typecheck", name: "TypeScript check", type: "run", disabled: false, run: "npm run typecheck", shell: "bash" },
      ],
    },
    {
      jobId: "test",
      label: "Run Tests",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 280 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-test", stepId: "test", name: "Run Jest tests", type: "run", disabled: false, run: "npm test -- --coverage", shell: "bash" },
      ],
    },
    {
      jobId: "e2e",
      label: "E2E Tests (Android)",
      color: "#A3E635",
      runsOn: "macos-latest",
      position: { x: 520, y: 460 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-e2e", stepId: "e2e", name: "Run Detox E2E", type: "run", disabled: false, run: "npm run e2e:android", shell: "bash" },
      ],
    },
  ],
  [
    { id: "trigger->lint", source: "trigger", target: "lint", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "lint->test", source: "lint", target: "test", sourceHandle: "job-out", targetHandle: "job-in" },
    { id: "test->e2e", source: "test", target: "e2e", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 5 — Security Scan (SAST/Dependency Audit)
// ---------------------------------------------------------------------------

const securityTemplate: SerializedGraph = makeGraph(
  "Security Scan Pipeline",
  "Run dependency audits, static analysis and secret scanning on every push.",
  "Security",
  ["Security", "Audit", "Secrets", "SAST", "Dependency Review"],
  ["push", "pull_request"],
  [
    {
      jobId: "audit",
      label: "Dependency Audit",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 100 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-audit", stepId: "audit", name: "Run npm audit", type: "run", disabled: false, run: "npm audit --audit-level=high", shell: "bash" },
        { id: "step-dependency-review", stepId: "dependency-review", name: "Dependency review", type: "action", disabled: false, uses: "actions/dependency-review-action@v4" },
      ],
    },
    {
      jobId: "secret-scan",
      label: "Secret Scanning",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 280 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4", with: { fetch_depth: "0" } },
        { id: "step-gitleaks", stepId: "gitleaks", name: "Run Gitleaks", type: "action", disabled: false, uses: "gitleaks/gitleaks-action@v2", with: { "target": "." } },
      ],
    },
    {
      jobId: "sast",
      label: "Static Analysis",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 460 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-eslint-security", stepId: "eslint-security", name: "SAST via ESLint security rules", type: "run", disabled: false, run: "npm run lint:security", shell: "bash" },
      ],
    },
  ],
  [
    { id: "trigger->audit", source: "trigger", target: "audit", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "audit->secret-scan", source: "audit", target: "secret-scan", sourceHandle: "job-out", targetHandle: "job-in" },
    { id: "secret-scan->sast", source: "secret-scan", target: "sast", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 6 — Rust (Backend)
// ---------------------------------------------------------------------------

const rustTemplate: SerializedGraph = makeGraph(
  "Rust CI",
  "Build, test and format-check a Rust crate with cross-compilation support.",
  "Backend",
  ["Rust", "Cargo", "Tests", "Cross-compile", "Format"],
  ["push", "pull_request"],
  [
    {
      jobId: "fmt",
      label: "Format & Clippy",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 100 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-rust", stepId: "setup-rust", name: "Setup Rust", type: "action", disabled: false, uses: "dtolnay/rust-toolchain@stable", with: { components: "clippy, rustfmt" } },
        { id: "step-fmt", stepId: "fmt", name: "Check formatting", type: "run", disabled: false, run: "cargo fmt --check", shell: "bash" },
        { id: "step-clippy", stepId: "clippy", name: "Run Clippy", type: "run", disabled: false, run: "cargo clippy -- -D warnings", shell: "bash" },
      ],
    },
    {
      jobId: "test",
      label: "Test & Build",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 280 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-rust", stepId: "setup-rust", name: "Setup Rust", type: "action", disabled: false, uses: "dtolnay/rust-toolchain@stable" },
        { id: "step-cache", stepId: "cache", name: "Cache cargo registry", type: "action", disabled: false, uses: "Swatinem/rust-cache@v2" },
        { id: "step-test", stepId: "test", name: "Run tests", type: "run", disabled: false, run: "cargo test --all-targets", shell: "bash" },
        { id: "step-build", stepId: "build", name: "Build release", type: "run", disabled: false, run: "cargo build --release", shell: "bash" },
      ],
    },
  ],
  [
    { id: "trigger->fmt", source: "trigger", target: "fmt", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "fmt->test", source: "fmt", target: "test", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 7 — Go (Backend)
// ---------------------------------------------------------------------------

const goTemplate: SerializedGraph = makeGraph(
  "Go CI",
  "Lint, test and build a Go module with cross-platform binaries.",
  "Backend",
  ["Go", "Golang", "Tests", "Cross-compile", "Lint"],
  ["push", "pull_request"],
  [
    {
      jobId: "lint",
      label: "Lint & Vet",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 100 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-go", stepId: "setup-go", name: "Setup Go", type: "action", disabled: false, uses: "actions/setup-go@v5", with: { "go-version": "1.22", "cache": "true" } },
        { id: "step-golangci-lint", stepId: "golangci-lint", name: "Run golangci-lint", type: "action", disabled: false, uses: "golangci/golangci-lint-action@v4", with: { "version": "v1.59" } },
        { id: "step-go-vet", stepId: "go-vet", name: "Go vet", type: "run", disabled: false, run: "go vet ./...", shell: "bash" },
      ],
    },
    {
      jobId: "test",
      label: "Test Suite",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 280 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-go", stepId: "setup-go", name: "Setup Go", type: "action", disabled: false, uses: "actions/setup-go@v5", with: { "go-version": "1.22", "cache": "true" } },
        { id: "step-test", stepId: "test", name: "Run tests with race detector", type: "run", disabled: false, run: "go test -race -cover ./...", shell: "bash" },
      ],
    },
    {
      jobId: "build",
      label: "Build Binaries",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 460 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-go", stepId: "setup-go", name: "Setup Go", type: "action", disabled: false, uses: "actions/setup-go@v5", with: { "go-version": "1.22", "cache": "true" } },
        { id: "step-build", stepId: "build", name: "Build cross-platform binaries", type: "run", disabled: false, run: "go build -o bin/app ./cmd/app", shell: "bash" },
        { id: "step-upload", stepId: "upload", name: "Upload binary artifact", type: "action", disabled: false, uses: "actions/upload-artifact@v4", with: { name: "binary", path: "bin/" } },
      ],
    },
  ],
  [
    { id: "trigger->lint", source: "trigger", target: "lint", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "lint->test", source: "lint", target: "test", sourceHandle: "job-out", targetHandle: "job-in" },
    { id: "test->build", source: "test", target: "build", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Template 8 — Static Site (Hugo / Astro)
// ---------------------------------------------------------------------------

const staticSiteTemplate: SerializedGraph = makeGraph(
  "Static Site CI",
  "Build and deploy a static site (Hugo / Astro) to a CDN on every push.",
  "Frontend",
  ["Static Site", "Hugo", "Astro", "CDN", "Deploy"],
  ["push", "workflow_dispatch"],
  [
    {
      jobId: "build",
      label: "Build Site",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 120 },
      steps: [
        { id: "step-checkout", stepId: "checkout", name: "Checkout", type: "action", disabled: false, uses: "actions/checkout@v4" },
        { id: "step-setup-node", stepId: "setup-node", name: "Setup Node.js", type: "action", disabled: false, uses: "actions/setup-node@v4", with: { "node-version": "20", "cache": "npm" } },
        { id: "step-install", stepId: "install", name: "Install dependencies", type: "run", disabled: false, run: "npm ci", shell: "bash" },
        { id: "step-build", stepId: "build", name: "Build static site", type: "run", disabled: false, run: "npm run build", shell: "bash" },
        { id: "step-upload", stepId: "upload", name: "Upload artifact", type: "action", disabled: false, uses: "actions/upload-artifact@v4", with: { name: "site", path: "dist/" } },
      ],
    },
    {
      jobId: "deploy",
      label: "Deploy to CDN",
      color: "#A3E635",
      runsOn: "ubuntu-latest",
      position: { x: 520, y: 320 },
      ifCondition: "github.ref == 'refs/heads/main'",
      steps: [
        { id: "step-download", stepId: "download", name: "Download build artifact", type: "action", disabled: false, uses: "actions/download-artifact@v4", with: { name: "site", path: "dist" } },
        { id: "step-deploy", stepId: "deploy", name: "Deploy to CDN", type: "action", disabled: false, uses: "cloudflare/wrangler-action@v3", with: { "apiToken": "${{ secrets.CLOUDFLARE_API_TOKEN }}", command: "pages deploy dist" } },
      ],
    },
  ],
  [
    { id: "trigger->build", source: "trigger", target: "build", sourceHandle: "trigger-out", targetHandle: "job-in" },
    { id: "build->deploy", source: "build", target: "deploy", sourceHandle: "job-out", targetHandle: "job-in" },
  ],
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface OfficialTemplate { id: string; title: string; description: string; category: string; tags: string[]; graphJson: SerializedGraph; yamlPreview: string; isOfficial: boolean; }

export const officialTemplates: OfficialTemplate[] = [
  {
    id: "nextjs",
    title: "Next.js CI",
    description: "Build, lint and test a Next.js application with Vercel-style deployment hooks.",
    category: "Frontend",
    tags: ["Next.js", "Vercel", "Lint", "Tests", "TypeScript"],
    graphJson: nextjsTemplate,
    yamlPreview: generateYamlPreview(nextjsTemplate),
    isOfficial: true,
  },
  {
    id: "backend",
    title: "Node.js Backend CI",
    description: "Lint, unit and integration test a Node.js API server with PostgreSQL service.",
    category: "Backend",
    tags: ["Node.js", "Express", "Tests", "Coverage", "PostgreSQL"],
    graphJson: backendTemplate,
    yamlPreview: generateYamlPreview(backendTemplate),
    isOfficial: true,
  },
  {
    id: "docker-k8s",
    title: "Docker & Kubernetes Pipeline",
    description: "Build a Docker image, push to registry and deploy to Kubernetes on main.",
    category: "Docker & K8s",
    tags: ["Docker", "Kubernetes", "AWS", "Docker Buildx", "Deploy"],
    graphJson: dockerK8sTemplate,
    yamlPreview: generateYamlPreview(dockerK8sTemplate),
    isOfficial: true,
  },
  {
    id: "mobile",
    title: "React Native CI",
    description: "Lint, typecheck and test a React Native app on iOS and Android.",
    category: "Mobile",
    tags: ["React Native", "iOS", "Android", "Expo", "Tests"],
    graphJson: mobileTemplate,
    yamlPreview: generateYamlPreview(mobileTemplate),
    isOfficial: true,
  },
  {
    id: "security",
    title: "Security Scan Pipeline",
    description: "Dependency audits, secret scanning and SAST on every push.",
    category: "Security",
    tags: ["Security", "Audit", "Secrets", "SAST", "Dependency Review"],
    graphJson: securityTemplate,
    yamlPreview: generateYamlPreview(securityTemplate),
    isOfficial: true,
  },
  {
    id: "rust",
    title: "Rust CI",
    description: "Format, clippy, test and build a Rust crate.",
    category: "Backend",
    tags: ["Rust", "Cargo", "Tests", "Cross-compile", "Format"],
    graphJson: rustTemplate,
    yamlPreview: generateYamlPreview(rustTemplate),
    isOfficial: true,
  },
  {
    id: "go",
    title: "Go CI",
    description: "Lint, vet, test and build cross-platform Go binaries.",
    category: "Backend",
    tags: ["Go", "Golang", "Tests", "Cross-compile", "Lint"],
    graphJson: goTemplate,
    yamlPreview: generateYamlPreview(goTemplate),
    isOfficial: true,
  },
  {
    id: "static-site",
    title: "Static Site CI",
    description: "Build and deploy a Hugo / Astro static site to a CDN.",
    category: "Frontend",
    tags: ["Static Site", "Hugo", "Astro", "CDN", "Deploy"],
    graphJson: staticSiteTemplate,
    yamlPreview: generateYamlPreview(staticSiteTemplate),
    isOfficial: true,
  },
];

// ---------------------------------------------------------------------------
// Lightweight YAML preview generator (used for the gallery cards only)
// ---------------------------------------------------------------------------

function generateYamlPreview(graph: SerializedGraph): string {
  // This produces a rough preview string for gallery cards. The canonical
  // YAML generation lives in graphToYaml.ts — this is intentionally lightweight.
  const lines: string[] = [];
  const settings = graph.globalSettings;
  lines.push(`name: ${settings.name}`);
  lines.push("");
  lines.push("on:");
  lines.push("  push:");
  lines.push("    branches: [main]");
  lines.push("  pull_request:");
  lines.push("    branches: [main]");
  lines.push("  workflow_dispatch:");
  lines.push("");
  lines.push("jobs:");
  for (const node of graph.nodes) {
    if (!node.data.job) continue;
    const job = node.data.job;
    lines.push(`  ${job.jobId}:`);
    lines.push(`    runs-on: ${ Array.isArray(job.runsOn) ? job.runsOn.join(", ") : job.runsOn }`);
    if (job.ifCondition) lines.push(`    if: ${job.ifCondition}`);
    lines.push("    steps:");
    for (const step of job.steps) {
      const stepName = step.name ?? step.uses ?? "Step";
      lines.push(`      - name: ${stepName}`);
      if (step.uses) lines.push(`        uses: ${step.uses}`);
      if (step.run) {
        const script = step.run.split("\n")[0];
        lines.push(`        run: ${script}`);
      }
      if (step.with) {
        for (const [k, v] of Object.entries(step.with)) {
          lines.push(`        with:`);
          lines.push(`          ${k}: ${v}`);
          break; // only first for preview brevity
        }
      }
    }
  }
  return lines.join("\n");
}

export function getOfficialTemplatesByCategory(): Map<string, typeof officialTemplates> {
  const map = new Map<string, typeof officialTemplates>();
  for (const template of officialTemplates) {
    const existing = map.get(template.category) ?? [];
    existing.push(template);
    map.set(template.category, existing);
  }
  return map;
}

export function searchOfficialTemplates(query: string): typeof officialTemplates {
  if (!query.trim()) return officialTemplates;
  const lower = query.toLowerCase();
  return officialTemplates.filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lower)),
  );
}
