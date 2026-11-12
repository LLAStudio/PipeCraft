import type { GraphNode, FinOpsEstimate } from "@/types/pipeline";

// ---------------------------------------------------------------------------
// FinOps — GitHub Actions minutes cost calculator
//
// Official multipliers:
//   ubuntu/* (Linux)   : 1x   ($0.008/min after free tier)
//   windows/*          : 2x   ($0.016/min)
//   macos/*            : 10x  ($0.08/min)
//   self-hosted        : 0x   (free quota impact, $0)
// ---------------------------------------------------------------------------

const BASE_COST_PER_MINUTE_LINUX_CENTS = 0.08; // $0.008/min after quota

function detectPlatform(runsOn: string | string[]): "linux" | "windows" | "macos" | "self-hosted" {
  if (Array.isArray(runsOn)) {
    // If any runner is non-linux, use the highest-cost platform
    for (const r of runsOn) {
      const platform = platformFromRunner(r);
      if (platform !== "linux") return platform;
    }
    return "linux";
  }
  return platformFromRunner(runsOn);
}

function platformFromRunner(runsOn: string): "linux" | "windows" | "macos" | "self-hosted" {
  const lower = runsOn.toLowerCase();
  if (lower.startsWith("ubuntu") || lower.startsWith("linux") || lower.startsWith("self")) {
    if (lower.includes("self")) return "self-hosted";
    return "linux";
  }
  if (lower.startsWith("windows")) return "windows";
  if (lower.startsWith("macos") || lower.startsWith("mac")) return "macos";
  return "linux"; // default
}

function multiplierForPlatform(platform: "linux" | "windows" | "macos" | "self-hosted"): number {
  switch (platform) {
    case "linux":
      return 1;
    case "windows":
      return 2;
    case "macos":
      return 10;
    case "self-hosted":
      return 0;
  }
}

function estimateInstanceCount(matrix: { axes: Array<{ key: string; values: string[] }>; include: Array<Record<string, string>>; exclude: Array<Record<string, string>> } | undefined): number {
  if (!matrix) return 1;
  let count = 1;
  for (const axis of matrix.axes) {
    count *= axis.values.length;
  }
  count += matrix.include.length;
  count -= matrix.exclude.length;
  return Math.max(1, count);
}

function estimateJobMinutes(jobNode: GraphNode, baseMinutesPerJob: number, secondsPerStep: number): {
  platform: "linux" | "windows" | "macos" | "self-hosted";
  multiplier: number;
  instances: number;
  estimatedMinutes: number;
} {
  const job = jobNode.data.job;
  if (!job) {
    return {
      platform: "linux",
      multiplier: 1,
      instances: 1,
      estimatedMinutes: baseMinutesPerJob,
    };
  }

  const platform = detectPlatform(job.runsOn);
  const multiplier = multiplierForPlatform(platform);
  const instanceCount = estimateInstanceCount(job.strategy?.matrix);
  const stepOverheadMinutes = (job.steps.length * secondsPerStep) / 60;
  const estimatedMinutes = baseMinutesPerJob + stepOverheadMinutes;

  return {
    platform,
    multiplier,
    instances: instanceCount,
    estimatedMinutes: Math.max(estimatedMinutes, 0.5), // minimum 30 seconds
  };
}

export function calculateFinops(
  nodes: GraphNode[],
  baseMinutesPerJob: number = 2,
  secondsPerStep: number = 30,
): FinOpsEstimate {
  const jobNodes = nodes.filter((n) => n.data.job || n.data.reusableWorkflow);

  let totalMinutes = 0;
  let linuxMinutes = 0;
  let windowsMinutes = 0;
  let macosMinutes = 0;
  let selfHostedMinutes = 0;
  const breakdown: FinOpsEstimate["matrixBreakdown"] = [];

  for (const jobNode of jobNodes) {
    const estimate = estimateJobMinutes(jobNode, baseMinutesPerJob, secondsPerStep);
    const rawMinutes = estimate.estimatedMinutes * estimate.instances;
    const chargedMinutes = rawMinutes * estimate.multiplier;

    switch (estimate.platform) {
      case "linux":
        linuxMinutes += chargedMinutes;
        break;
      case "windows":
        windowsMinutes += chargedMinutes;
        break;
      case "macos":
        macosMinutes += chargedMinutes;
        break;
      case "self-hosted":
        selfHostedMinutes += rawMinutes; // multiplier 0 but tracked separately
        break;
    }

    totalMinutes += chargedMinutes;

    breakdown.push({
      jobId: jobNode.id,
      name: jobNode.data.job?.name ?? jobNode.data.reusableWorkflow?.name ?? jobNode.id,
      multiplier: estimate.multiplier,
      instances: estimate.instances,
      estimatedMinutes: Math.round(chargedMinutes * 100) / 100,
      platform: estimate.platform,
    });
  }

  // Approximate cost: GitHub charges after free tier; here we show raw
  // billable minutes * $0.008/min for Linux, scaled by multiplier for others.
  const effectiveMinutes = linuxMinutes + windowsMinutes + macosMinutes;
  const costInCents = Math.round((effectiveMinutes * BASE_COST_PER_MINUTE_LINUX_CENTS) * 100) / 100;

  return {
    totalMinutes: Math.round(totalMinutes * 100) / 100,
    linuxMinutes: Math.round(linuxMinutes * 100) / 100,
    windowsMinutes: Math.round(windowsMinutes * 100) / 100,
    macosMinutes: Math.round(macosMinutes * 100) / 100,
    selfHostedMinutes: Math.round(selfHostedMinutes * 100) / 100,
    costInCents,
    matrixBreakdown: breakdown,
  };
}

/**
 * Format the FinOps estimate into a human-readable summary string.
 */
export function formatFinopsSummary(estimate: FinOpsEstimate): string {
  const parts: string[] = [];
  if (estimate.totalMinutes > 0) {
    parts.push(`${estimate.totalMinutes} billed min`);
  } else {
    parts.push("0 billed minutes");
  }

  const platformParts: string[] = [];
  if (estimate.linuxMinutes > 0) {
    platformParts.push(`${estimate.linuxMinutes} min Linux`);
  }
  if (estimate.windowsMinutes > 0) {
    platformParts.push(`${estimate.windowsMinutes} min Windows`);
  }
  if (estimate.macosMinutes > 0) {
    platformParts.push(`${estimate.macosMinutes} min macOS`);
  }
  if (estimate.selfHostedMinutes > 0) {
    platformParts.push(`${estimate.selfHostedMinutes} min self-hosted`);
  }

  if (platformParts.length > 0) {
    parts.push(`(including ${platformParts.join(", ")})`);
  }

  parts.push(`≈ ${formatCost(estimate.costInCents)}`);

  return parts.join(" ");
}

function formatCost(cents: number): string {
  if (cents < 1) return "< 1¢";
  const dollars = cents / 100;
  if (dollars < 1) return `${cents}¢`;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Safe version that handles missing nodes gracefully.
 */
export function calculateFinopsSafe(
  nodes: readonly GraphNode[] | null | undefined,
  baseMinutesPerJob: number = 2,
  secondsPerStep: number = 30,
): FinOpsEstimate {
  if (!nodes || nodes.length === 0) {
    return {
      totalMinutes: 0,
      linuxMinutes: 0,
      windowsMinutes: 0,
      macosMinutes: 0,
      selfHostedMinutes: 0,
      costInCents: 0,
      matrixBreakdown: [],
    };
  }
  return calculateFinops([...nodes], baseMinutesPerJob, secondsPerStep);
}
