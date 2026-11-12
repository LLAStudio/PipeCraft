import type { WorkflowProject } from "@prisma/client";
import type { SerializedGraph } from "@/types/pipeline";

function graphCounts(graphJson: unknown): { nodeCount: number; edgeCount: number } {
  const graph = graphJson as Partial<SerializedGraph> | null;
  return {
    nodeCount: Array.isArray(graph?.nodes) ? graph.nodes.length : 0,
    edgeCount: Array.isArray(graph?.edges) ? graph.edges.length : 0,
  };
}

export function serializeProject(project: WorkflowProject) {
  const counts = graphCounts(project.graphJson);
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    repoOwner: project.repoOwner,
    repoName: project.repoName,
    repoBranch: project.repoBranch,
    filePath: project.filePath,
    isValid: project.isValid,
    securityScore: project.securityScore,
    nodeCount: counts.nodeCount,
    edgeCount: counts.edgeCount,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function isSerializedGraph(value: unknown): value is SerializedGraph {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SerializedGraph>;
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}
