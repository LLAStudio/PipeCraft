import { Edge, Node } from "@xyflow/react";

export function validateEdgeConnection(
  connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null },
  _nodes: Node[],
  edges: Edge[],
): boolean {
  // Deny self-connections
  if (connection.source === connection.target) return false;
  // Deny duplicate edges
  if (edges.some((e) => e.source === connection.source && e.target === connection.target)) {
    return false;
  }
  // Basic cycle check (DFS)
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const arr = adj.get(e.source) ?? [];
    arr.push(e.target);
    adj.set(e.source, arr);
  }
  const visited = new Set<string>();
  const stack = [connection.target];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === connection.source) return false;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const next of adj.get(cur) ?? []) {
      stack.push(next);
    }
  }
  return true;
}
