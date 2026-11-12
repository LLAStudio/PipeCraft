import type { GraphNode, ReactFlowEdge, ValidationError } from "@/types/pipeline";

// ---------------------------------------------------------------------------
// Graph-level validation: cycles, orphan jobs, broken output references
// ---------------------------------------------------------------------------

const JOB_ID_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * Validate a pipeline graph for structural correctness.
 *
 * Returns a list of validation errors with severity, code, message, and
 * optional nodeId for highlighting the offending node on the canvas.
 */
export function validateGraph(
  nodes: GraphNode[],
  edges: ReactFlowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Detect cycles using DFS (should not happen due to onConnect guard,
  //    but re-validate after import / batch edits).
  const cycleErrors = detectCycles(nodes, edges);
  errors.push(...cycleErrors);

  // 2. Orphan jobs: jobs that are not connected to the trigger directly
  //    or indirectly through another job.
  const orphanErrors = detectOrphanJobs(nodes, edges);
  errors.push(...orphanErrors);

  // 3. Broken needs / output references: check that every ${{ needs.* }}
  //    expression in step run/env/with values references an existing job id.
  const referenceErrors = detectBrokenOutputReferences(nodes, edges);
  errors.push(...referenceErrors);

  // 4. Job id validation
  const idErrors = detectInvalidJobIds(nodes);
  errors.push(...idErrors);

  // 5. Job id uniqueness (should be guaranteed by node id equality, but
  //    double-check for imported graphs where id and jobId may diverge).
  const duplicateJobIdErrors = detectDuplicateJobIds(nodes);
  errors.push(...duplicateJobIdErrors);

  // 6. Check for jobs with no steps
  const emptyJobErrors = detectEmptyJobs(nodes);
  errors.push(...emptyJobErrors);

  // 7. Check for trigger node presence (there must be exactly one trigger)
  const triggerErrors = detectTriggerIssues(nodes);
  errors.push(...triggerErrors);

  return errors;
}

// ---------------------------------------------------------------------------
// Cycle detection (DFS-based)
// ---------------------------------------------------------------------------

function detectCycles(
  nodes: GraphNode[],
  edges: ReactFlowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  const jobNodes = nodes.filter(
    (n) => n.data.job || n.data.reusableWorkflow,
  );
  const jobIds = new Set(jobNodes.map((n) => n.id));
  const adjacency = new Map<string, string[]>();

  for (const id of jobIds) {
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!jobIds.has(edge.source) || !jobIds.has(edge.target)) continue;
    adjacency.get(edge.source)!.push(edge.target);
  }

  // DFS with colors: 0 = unvisited, 1 = in stack, 2 = done
  const color = new Map<string, number>();
  for (const id of jobIds) color.set(id, 0);

  const parent = new Map<string, string | null>();
  let cycleFound = false;

  function dfs(nodeId: string): boolean {
    color.set(nodeId, 1); // in current path
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (color.get(neighbor) === 1) {
        // Back edge — cycle!
        cycleFound = true;
        // Build the cycle path for the error message
        const cyclePath: string[] = [neighbor, nodeId];
        let current: string | null = nodeId;
        while (current && current !== neighbor) {
          current = parent.get(current) ?? null;
          if (current) cyclePath.push(current);
        }
        errors.push({
          severity: "error",
          code: "CYCLE_DETECTED",
          message: `Circular dependency detected: ${cyclePath.reverse().join(" → ")}`,
          nodeId: neighbor,
        });
        return true;
      }
      if (color.get(neighbor) === 0) {
        parent.set(neighbor, nodeId);
        if (dfs(neighbor)) return true;
      }
    }
    color.set(nodeId, 2); // done
    return false;
  }

  for (const id of jobIds) {
    if (color.get(id) === 0) {
      parent.set(id, null);
      dfs(id);
      if (cycleFound) break;
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Orphan job detection
// ---------------------------------------------------------------------------

function detectOrphanJobs(
  nodes: GraphNode[],
  edges: ReactFlowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const jobNodes = nodes.filter(
    (n) => n.data.job || n.data.reusableWorkflow,
  );
  const triggerNode = nodes.find((n) => n.type === "trigger");

  if (!triggerNode) return errors; // trigger issues reported separately

  const connectedJobIds = new Set<string>();
  const jobIds = new Set(jobNodes.map((node) => node.id));
  const queue = [triggerNode.id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current && jobIds.has(edge.target)) {
        connectedJobIds.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  // A job is orphan if it is not reachable from the trigger
  for (const node of jobNodes) {
    if (!connectedJobIds.has(node.id)) {
      errors.push({
        severity: "error",
        code: "ORPHAN_JOB",
        message: `Job "${node.data.job?.name ?? node.id}" is not connected to any trigger`,
        nodeId: node.id,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Broken output references
// ---------------------------------------------------------------------------

function detectBrokenOutputReferences(
  nodes: GraphNode[],
  edges: ReactFlowEdge[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  const jobNodes = nodes.filter(
    (n) => n.data.job || n.data.reusableWorkflow,
  );
  const jobIdSet = new Set(jobNodes.map((n) => n.id));

  // Collect all needs references from edges
  const jobNeeds = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!jobIdSet.has(edge.source) || !jobIdSet.has(edge.target)) continue;
    if (!jobNeeds.has(edge.target)) {
      jobNeeds.set(edge.target, new Set());
    }
    jobNeeds.get(edge.target)!.add(edge.source);
  }

  // Scan every job's steps for ${{ needs.* }} expressions
  for (const node of jobNodes) {
    const job = node.data.job;
    if (!job) continue;

    const neededJobs = jobNeeds.get(node.id) ?? new Set<string>();

    for (let stepIndex = 0; stepIndex < job.steps.length; stepIndex++) {
      const step = job.steps[stepIndex];
      if (!step) continue;
      const locations = [
        step.run ?? "",
        step.ifCondition ?? "",
        step.name ?? "",
        step.stepId ?? "",
        step.workingDirectory ?? "",
        step.shell ?? "",
        ...(Object.values(step.env ?? {})).map(String),
        ...(Object.values(step.with ?? {})).map(String),
        ...(Object.values(step.with ?? {})).map(String),
      ];

      for (const location of locations) {
        const refs = extractNeedsReferences(location);
        for (const ref of refs) {
          if (!neededJobs.has(ref)) {
            errors.push({
              severity: "error",
              code: "BROKEN_NEEDS_REF",
              message: `needs.${ref} reference not found — this job does not depend on job "${ref}"`,
              nodeId: node.id,
              stepIndex,
            });
          }
        }
      }
    }
  }

  // Also scan for ${{ needs.*.outputs.* }} references and verify the
  // referenced job actually has matching outputs defined.
  for (const node of jobNodes) {
    const job = node.data.job;
    if (!job) continue;

    for (let stepIndex = 0; stepIndex < job.steps.length; stepIndex++) {
      const step = job.steps[stepIndex];
      if (!step) continue;
      const locations = [
        step.run ?? "",
        step.with ? JSON.stringify(step.with) : "",
        step.env ? JSON.stringify(step.env) : "",
      ];

      for (const location of locations) {
        const outputRefs = extractNeedsOutputReferences(location);
        for (const { jobName, outputName } of outputRefs) {
          // Check if the referenced job exists
          const referencedJob = jobNodes.find(
            (n) =>
              n.id === jobName ||
              (n.data.job?.jobId === jobName) ||
              (n.data.job?.name === jobName),
          );
          if (!referencedJob) {
            errors.push({
              severity: "error",
              code: "BROKEN_OUTPUT_REF",
              message: `Output \${{ needs.${jobName}.outputs.${outputName} }} references an unknown job`,
              nodeId: node.id,
              stepIndex,
            });
          } else {
            // Check that the referenced job actually defines that output
            const refJob = referencedJob.data.job;
            if (refJob && !Object.prototype.hasOwnProperty.call(refJob.outputs ?? {}, outputName)) {
              errors.push({
                severity: "warning",
                code: "MISSING_OUTPUT_DEFINITION",
                message: `Job "${refJob.name}" does not define output \"${outputName}\"`,
                nodeId: referencedJob.id,
                stepIndex,
              });
            }
          }
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Regex-based extraction of ${{ needs.* }} and ${{ needs.*.outputs.* }}
// ---------------------------------------------------------------------------

function extractNeedsReferences(text: string): string[] {
  const regex = /\$\{\{\s*needs\.(\w+)\s*\}\}/g;
  const refs: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const ref = match[1];
    if (ref) refs.push(ref);
  }
  return refs;
}

function extractNeedsOutputReferences(text: string): Array<{ jobName: string; outputName: string }> {
  const regex = /\$\{\{\s*needs\.(\w+)\.outputs\.(\w+)\s*\}\}/g;
  const refs: Array<{ jobName: string; outputName: string }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const jobName = match[1];
    const outputName = match[2];
    if (jobName && outputName) refs.push({ jobName, outputName });
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Job id validation
// ---------------------------------------------------------------------------

function detectInvalidJobIds(nodes: GraphNode[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    const job = node.data.job;
    if (!job) continue;

    if (!JOB_ID_REGEX.test(job.jobId)) {
      errors.push({
        severity: "error",
        code: "INVALID_JOB_ID",
        message: `jobId "${job.jobId}" is invalid. Must match ^[a-zA-Z_][a-zA-Z0-9_-]*$`,
        nodeId: node.id,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Duplicate job id detection
// ---------------------------------------------------------------------------

function detectDuplicateJobIds(nodes: GraphNode[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const jobIdMap = new Map<string, GraphNode[]>();

  for (const node of nodes) {
    const job = node.data.job;
    if (!job) continue;
    const existing = jobIdMap.get(job.jobId) ?? [];
    existing.push(node);
    jobIdMap.set(job.jobId, existing);
  }

  for (const [jobId, nodesWithId] of jobIdMap) {
    if (nodesWithId.length > 1) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_JOB_ID",
        message: `jobId "${jobId}" is used by multiple nodes`,
        nodeId: nodesWithId[0]?.id,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Empty job detection
// ---------------------------------------------------------------------------

function detectEmptyJobs(nodes: GraphNode[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    const job = node.data.job;
    if (!job) continue;

    if (job.steps.length === 0) {
      errors.push({
        severity: "warning",
        code: "EMPTY_JOB",
        message: `Job "${job.name}" has no steps`,
        nodeId: node.id,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Trigger node issues
// ---------------------------------------------------------------------------

function detectTriggerIssues(nodes: GraphNode[]): ValidationError[] {
  const errors: ValidationError[] = [];

  const triggerNodes = nodes.filter((n) => n.type === "trigger");

  if (triggerNodes.length === 0) {
    errors.push({
      severity: "error",
      code: "MISSING_TRIGGER",
      message: "No trigger node on the canvas",
    });
  }

  if (triggerNodes.length > 1) {
    errors.push({
      severity: "error",
      code: "DUPLICATE_TRIGGER",
      message: "Multiple trigger nodes found — only one trigger is allowed",
      nodeId: triggerNodes[1]?.id,
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Full structural validation + severity summarisation
// ---------------------------------------------------------------------------

export interface GraphValidationSummary {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  errors: ValidationError[];
}

export function validateGraphSummary(
  nodes: GraphNode[],
  edges: ReactFlowEdge[],
): GraphValidationSummary {
  const errors = validateGraph(nodes, edges);
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;
  const infoCount = errors.filter((e) => e.severity === "info").length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    errors,
  };
}
