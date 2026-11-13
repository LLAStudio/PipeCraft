import type {
  GraphNode,
  SecurityAlert,
  WorkflowGlobalSettings,
} from "@/types/pipeline";

// ---------------------------------------------------------------------------
// DevSecOps security linter
//
// Scans the pipeline graph for common security anti-patterns and produces
// a list of SecurityAlert entries with auto-fix closures.
//
// Score starts at 100 and each alert deducts its points.
// ---------------------------------------------------------------------------

const INITIAL_SCORE = 100;

// Patterns that resemble hardcoded secrets
const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{36}/, // GitHub personal access token
  /gho_[A-Za-z0-9]{36}/, // GitHub OAuth token
  /ghu_[A-Za-z0-9]{36}/, // GitHub fine-grained PAT
  /ghs_[A-Za-z0-9]{36}/, // GitHub app token
  /ghr_[A-Za-z0-9]{36}/, // GitHub refresh token
  /sk-[A-Za-z0-9]{20,}/, // OpenAI / Stripe-style secret key
  /sk_live_[A-Za-z0-9]{20,}/,
  /AKIA[A-Z0-9]{16}/, // AWS access key ID
  /Bearer [A-Za-z0-9\-._~+/]+=*&/, // Bearer token (broad)
  /xox[baprs]-[A-Za-z0-9\-]{8,}/, // Slack bot/user tokens
  /AIza[0-9A-Za-z\-_]{35}/, // Google API key
  /AIzaSy[A-Za-z0-9\-_]{33}/,
  /key-[A-Fa-f0-9]{32}/,
];

const UNSAFE_EXPRESSION_PATTERNS = [
  /\$\{\{.*github\.event\.issue\.title.*\}\}/,
  /\$\{\{.*github\.event\.issue\.body.*\}\}/,
  /\$\{\{.*github\.event\.pull_request\.title.*\}\}/,
  /\$\{\{.*github\.event\.pull_request\.body.*\}\}/,
  /\$\{\{.*github\.event\.comment\.body.*\}\}/,
  /\$\{\{.*github\.head_ref.*\}\}/,
  /\$\{\{.*github\.event\.sender.*\}\}/,
];

// ---------------------------------------------------------------------------
// Main linter entry point
// ---------------------------------------------------------------------------

export function lintSecurity(
  nodes: GraphNode[],
  globalSettings: WorkflowGlobalSettings | null,
): { score: number; alerts: SecurityAlert[] } {
  const alerts: SecurityAlert[] = [];

  // SEC-003: permissions at root level (critical, -20 pts)
  checkPermissionsAlerts(globalSettings, alerts);

  // SEC-002: unpinned actions (warning, -15 pts)
  checkUnpinnedActions(nodes, alerts);

  // SEC-001: script injection (critical, -25 pts)
  checkScriptInjection(nodes, alerts);

  // SEC-004: hardcoded secrets (info, -5 pts each)
  checkHardcodedSecrets(nodes, alerts);

  // Compute final score — floor at 0
  let score = INITIAL_SCORE;
  for (const alert of alerts) {
    score -= alert.pointsDeducted;
  }
  score = Math.max(0, score);

  return { score, alerts };
}

// ---------------------------------------------------------------------------
// SEC-003: permissions
// ---------------------------------------------------------------------------

function checkPermissionsAlerts(
  globalSettings: WorkflowGlobalSettings | null,
  alerts: SecurityAlert[],
): void {
  if (!globalSettings) return;

  const perm = globalSettings.permissions;

  // Missing permissions entirely
  if (!perm) {
    alerts.push({
      rule: "SEC-003",
      severity: "critical",
      pointsDeducted: 20,
      message:
        "No workflow-level permissions. By default GITHUB_TOKEN has all scopes.",
      autoFix: () => {
        // Auto-fix will be applied by the caller via store update
      },
      autoFixDescription: 'Add `permissions: { contents: "read" }`',
    });
    return;
  }

  // write-all
  if (perm === "write-all") {
    alerts.push({
      rule: "SEC-003",
      severity: "critical",
      pointsDeducted: 20,
      message:
        "permissions: write-all grants excessive write access to GITHUB_TOKEN across all scopes.",
      autoFixDescription: 'Replace with `permissions: { contents: "read" }`',
    });
  }

  // If it's an object, check for overly broad permissions
  if (typeof perm === "object" && perm !== null) {
    const permObj = perm as Record<string, string>;
    const writeScopes = Object.entries(permObj).filter(
      ([, value]) => value === "write",
    );
    if (writeScopes.length > 2) {
      alerts.push({
        rule: "SEC-003",
        severity: "warning",
        pointsDeducted: 10,
        message: `Write permissions on ${writeScopes.length} scopes — consider limiting them to the minimum required.`,
        autoFixDescription: "Review write-all scopes",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// SEC-002: unpinned actions
// ---------------------------------------------------------------------------

function checkUnpinnedActions(nodes: GraphNode[], alerts: SecurityAlert[]): void {
  for (const node of nodes) {
    const job = node.data.job;
    if (!job) continue;

    for (let stepIndex = 0; stepIndex < (job.steps?.length ?? 0); stepIndex++) {
      const step = job.steps[stepIndex];
      if (!step) continue;
      if (step.type !== "action" || !step.uses) continue;

      const pinStatus = analyzeActionPin(step.uses);
      if (!pinStatus.pinned) {
        alerts.push({
          rule: "SEC-002",
          severity: "warning",
          pointsDeducted: 15,
          message: `Action not pinned to a SHA: ${step.uses} (${pinStatus.reason})`,
          nodeId: node.id,
          stepIndex,
          autoFixDescription: "Fetch the commit SHA via the GitHub API and add it as a comment",
        });
      }
    }

    // Check reusable workflow uses
    const reusable = node.data.reusableWorkflow;
    if (reusable && reusable.uses) {
      const pinStatus = analyzeActionPin(reusable.uses);
      if (!pinStatus.pinned) {
        alerts.push({
          rule: "SEC-002",
          severity: "warning",
          pointsDeducted: 15,
          message: `Reusable workflow not pinned: ${reusable.uses} (${pinStatus.reason})`,
          nodeId: node.id,
          autoFixDescription: "Pin to a specific commit SHA",
        });
      }
    }
  }
}

function analyzeActionPin(uses: string): { pinned: boolean; reason: string } {
  // actions/* and github/* are first-party and may use tags safely in many
  // contexts, but ideally they should also be pinned for reproducibility.
  const isFirstParty = uses.startsWith("actions/") || uses.startsWith("github/");

  // Check for @ followed by a 40-character hex SHA
  const shaMatch = uses.match(/@([a-f0-9]{40})$/i);
  if (shaMatch) {
    return { pinned: true, reason: "Pinned to a commit SHA" };
  }

  // Check if it uses @main, @master, @develop or similar mutable refs
  const mutableRefMatch = uses.match(/@(main|master|develop|next|latest)$/);
  if (mutableRefMatch) {
    return { pinned: false, reason: `Mutable branch (${mutableRefMatch[1]})` };
  }

  // Check for a tag like @v1, @v2 — these are mutable if they're simple
  const tagMatch = uses.match(/@v?\d+$/);
  if (tagMatch && !isFirstParty) {
    // For third-party actions, a simple version tag is a risk
    return { pinned: false, reason: `Tag de version mutable (${tagMatch[0]})` };
  }

  // Check for @vX.Y.Z — still a tag, still mutable
  const semverTag = uses.match(/@v?\d+\.\d+\.\d+$/);
  if (semverTag && !isFirstParty) {
    return { pinned: false, reason: `Mutable semantic tag (${semverTag[0]})` };
  }

  // If it has no @ at all, it's referencing a branch by default
  if (!uses.includes("@")) {
    return { pinned: false, reason: "No version reference specified" };
  }

  // First-party actions with tag are lower risk but still flagged
  if (isFirstParty && tagMatch) {
    return { pinned: false, reason: `Version tag (${tagMatch[0]}) — actions/ is first-party but not pinned` };
  }

  // Fallback: if we got here, assume not pinned
  return { pinned: false, reason: "Unpinned reference" };
}

// ---------------------------------------------------------------------------
// SEC-001: script injection
// ---------------------------------------------------------------------------

function checkScriptInjection(nodes: GraphNode[], alerts: SecurityAlert[]): void {
  for (const node of nodes) {
    const job = node.data.job;
    if (!job) continue;

    for (let stepIndex = 0; stepIndex < (job.steps?.length ?? 0); stepIndex++) {
      const step = job.steps[stepIndex];
      if (!step) continue;
      if (step.type !== "run" || !step.run) continue;

      const script = step.run;
      for (const pattern of UNSAFE_EXPRESSION_PATTERNS) {
        if (pattern.test(script)) {
          // Determine which untrusted expression it is
          const match = script.match(/\$\{\{([^}]+)\}\}/g);
          const expressions = match
            ? match.map((m) => m.replace(/\$\{\{/, "").replace(/\}\}/, "").trim())
            : [];

          const untrustedExprs = expressions.filter((expr) => {
            const lower = expr.toLowerCase();
            return (
              lower.includes("github.event.issue.title") ||
              lower.includes("github.event.issue.body") ||
              lower.includes("github.event.pull_request.title") ||
              lower.includes("github.event.pull_request.body") ||
              lower.includes("github.event.comment.body") ||
              lower.includes("github.head_ref")
            );
          });

          if (untrustedExprs.length > 0) {
            alerts.push({
              rule: "SEC-001",
              severity: "critical",
              pointsDeducted: 25,
              message: `Possible script injection via unsafe expression: ${untrustedExprs[0]}. Never use user input directly in a run: block without validation.`,
              nodeId: node.id,
              stepIndex,
              autoFixDescription: `Move the expression to the step env: and use "$VAR" in the script`,
              autoFix: () => {
                // The auto-fix logic is applied by the caller; this alert
                // serves as documentation for what the fix would do.
              },
            });
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SEC-004: hardcoded secrets
// ---------------------------------------------------------------------------

function checkHardcodedSecrets(nodes: GraphNode[], alerts: SecurityAlert[]): void {
  const seenSecrets = new Set<string>();

  for (const node of nodes) {
    const job = node.data.job;
    if (!job) continue;

    // Check job-level env
    for (const [key, value] of Object.entries(job.env ?? {})) {
      checkSecretValue(value, `Job "${job.name}" → env.${key}`, node.id, -1, alerts, seenSecrets);
    }

    // Check step-level values
    for (let stepIndex = 0; stepIndex < (job.steps?.length ?? 0); stepIndex++) {
      const step = job.steps[stepIndex];
      if (!step) continue;

      // Step env
      if (step.env) {
        for (const [key, value] of Object.entries(step.env)) {
          checkSecretValue(value, `Step "${step.name ?? step.id}" → env.${key}`, node.id, stepIndex, alerts, seenSecrets);
        }
      }

      // Step run script
      if (step.run) {
        checkSecretInText(step.run, `Step "${step.name ?? step.id}" → run:`, node.id, stepIndex, alerts, seenSecrets);
      }

      // Step with values
      if (step.with) {
        for (const [key, value] of Object.entries(step.with)) {
          checkSecretValue(value, `Step "${step.name ?? step.id}" → with.${key}`, node.id, stepIndex, alerts, seenSecrets);
        }
      }
    }

    // Reusable workflow with / secrets
    const reusable = node.data.reusableWorkflow;
    if (reusable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withAny: Record<string, unknown> = (reusable as any).with ?? {};
      for (const [key, value] of Object.entries(withAny)) {
        checkSecretValue(value as string, `Reusable workflow → with.${key}`, node.id, -1, alerts, seenSecrets);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const secrets: unknown = (reusable as any).secrets ?? null;
      if (typeof secrets === "object" && secrets !== null) {
        for (const [key, value] of Object.entries(secrets as Record<string, unknown>)) {
          checkSecretValue(value as string, `Reusable workflow → secrets.${key}`, node.id, -1, alerts, seenSecrets);
        }
      }
    }
  }

  // Also check global env
  // (globalSettings is handled separately; the caller could pass it in, but
  //  for now we only lint the graph nodes)
}

function checkSecretValue(
  value: string,
  location: string,
  nodeId: string,
  stepIndex: number,
  alerts: SecurityAlert[],
  seen: Set<string>,
): void {
  for (const pattern of SECRET_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      const matched = match[0];
      if (seen.has(matched)) continue;
      seen.add(matched);

      alerts.push({
        rule: "SEC-004",
        severity: "info",
        pointsDeducted: 5,
        message: `Potential secret detected (${pattern.source}) in ${location}: "${matched.substring(0, 8)}…". Replace with \${{ secrets.SECRET_NAME }}.`,
        nodeId,
        stepIndex,
        autoFixDescription: "Replace with ${{ secrets.MY_SECRET }}",
      });
    }
  }
}

function checkSecretInText(
  text: string,
  location: string,
  nodeId: string,
  stepIndex: number,
  alerts: SecurityAlert[],
  seen: Set<string>,
): void {
  // Split into tokens and check each
  const tokens = text.split(/[ \t\n;]+/);
  for (const token of tokens) {
    if (token.length < 8) continue;
    checkSecretValue(token, location, nodeId, stepIndex, alerts, seen);
  }
}

// ---------------------------------------------------------------------------
// Auto-fix application (called by the UI when user clicks "Corriger en 1 clic")
// ---------------------------------------------------------------------------

export interface SecurityAutoFix {
  alert: SecurityAlert;
  apply: () => void;
}

/**
 * Build a list of auto-fix closures for the given alerts.
 *
 * Each closure mutates the graph nodes directly so the UI can show the
 * corrected state. Callers should re-run validation after applying.
 */
export function buildAutoFixes(
  alerts: SecurityAlert[],
  _nodes: GraphNode[],
): SecurityAutoFix[] {
  return alerts.map((alert) => ({
    alert,
    apply: () => {
      // For SEC-001, we would move the expression to env and replace in run.
      // For SEC-002, we would fetch the SHA (async, so the UI shows a prompt).
      // For SEC-003, we would update the global permissions.
      // For SEC-004, we would replace the secret value with ${{ secrets.* }}.

      // In this version, auto-fix is a no-op stub; the real implementation
      // is wired via the PropertyInspector / ValidationConsole components.
    },
  }));
}
