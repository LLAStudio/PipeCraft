import type { GraphNode, JobNodeData, LiveStatus } from "@/types/pipeline";

export interface LiveRunInfo {
  status: LiveStatus;
  durationSeconds: number | undefined;
}

/** Read the live run badge information carried by a job node. */
export function getLiveRun(
  node: Pick<GraphNode, "data"> | null | undefined,
): LiveRunInfo | null {
  const job: JobNodeData | undefined = node?.data.job;
  if (!job?.liveStatus) return null;
  return { status: job.liveStatus, durationSeconds: job.liveDurationSeconds };
}

/** Map a GitHub workflow run status/conclusion to our internal live status. */
export function mapGitHubRunStatus(
  status: string | null,
  conclusion: string | null,
): LiveStatus | null {
  if (status === "queued") return "queued";
  if (status === "in_progress") return "in_progress";
  if (status !== "completed") return null;

  switch (conclusion) {
    case "success":
      return "completed_success";
    case "failure":
    case "timed_out":
    case "startup_failure":
      return "completed_failure";
    case "cancelled":
      return "cancelled";
    case "skipped":
    case "neutral":
      return "skipped";
    default:
      return "completed_success";
  }
}

export type BadgeStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped";

/** Compact status label used by the node badges. */
export function statusToBadge(status: LiveStatus | null): BadgeStatus | null {
  switch (status) {
    case null:
      return null;
    case "queued":
      return "queued";
    case "in_progress":
      return "in_progress";
    case "completed_success":
      return "completed";
    case "completed_failure":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "skipped":
      return "skipped";
  }
}
