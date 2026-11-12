import dagre from "@dagrejs/dagre";
import type { GraphNode, ReactFlowEdge } from "@/types/pipeline";

// ---------------------------------------------------------------------------
// Dagre-based auto-layout for React Flow graph
//
// Computes (x, y) positions for every node in the graph using a layered
// topological algorithm. Jobs (and reusable workflows) are treated as the
// graph vertices; the trigger node is always the leftmost root.
//
// Node dimensions:
//   - Trigger:   180 x 80  (default; can be overridden)
//   - Job:       240 x (120 + steps.length * 44 + 80)
//   - Step:      only exists inside a job, not laid out independently
//   - Reusable:  240 x 90
// ---------------------------------------------------------------------------

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

export interface LayoutResult {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
  }>;
  edges: ReactFlowEdge[];
}

const TRIGGER_WIDTH = 180;
const TRIGGER_HEIGHT = 80;
const JOB_WIDTH = 240;
const STEP_HEIGHT = 44;
const JOB_BASE_HEIGHT = 120;
const JOB_HEAD_HEIGHT = 40;

function estimateJobHeight(node: GraphNode): number {
  if (node.data.job) {
    const steps = node.data.job.steps.length;
    return JOB_BASE_HEIGHT + steps * STEP_HEIGHT + JOB_HEAD_HEIGHT;
  }
  if (node.data.reusableWorkflow) {
    return 90;
  }
  return TRIGGER_HEIGHT;
}

function estimateNodeWidth(node: GraphNode): number {
  if (node.type === "trigger") return TRIGGER_WIDTH;
  if (node.type === "job") return JOB_WIDTH;
  if (node.type === "reusableWorkflow") return JOB_WIDTH;
  return TRIGGER_WIDTH;
}

export function computeAutoLayout(
  nodes: GraphNode[],
  edges: ReactFlowEdge[],
  options: {
    rankdir?: "LR" | "TB";
    nodesep?: number;
    ranksep?: number;
  } = {},
): LayoutResult {
  const rankdir = options.rankdir ?? "LR";
  const nodesep = options.nodesep ?? 80;
  const ranksep = options.ranksep ?? 160;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir,
    nodesep,
    ranksep,
    // dagre will compute widths/heights internally
    edgesep: 20,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Filter only the nodes that participate in the layout (jobs + trigger)
  const layoutNodes: GraphNode[] = [];
  for (const node of nodes) {
    if (node.type === "trigger" || node.type === "job" || node.type === "reusableWorkflow") {
      layoutNodes.push(node);
    }
  }

  // Add nodes with estimated dimensions
  for (const node of layoutNodes) {
    const width = estimateNodeWidth(node);
    const height = estimateJobHeight(node);
    g.setNode(node.id, { width, height });
  }

  // Add edges
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    // Only add edges between nodes that are in the layout
    if (layoutNodes.some((n) => n.id === edge.source) &&
        layoutNodes.some((n) => n.id === edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  // Run the layout
  dagre.layout(g);

  // Extract computed positions
  const resultNodes: Array<{ id: string; x: number; y: number }> = [];
  for (const node of layoutNodes) {
    const dagreNode = g.node(node.id);
    if (!dagreNode) continue;
    // dagre centers the node at (x, y); we want top-left
    const x = dagreNode.x - (dagreNode.width ?? 100) / 2;
    const y = dagreNode.y - (dagreNode.height ?? 100) / 2;
    resultNodes.push({ id: node.id, x, y });
  }

  // Build the result; edges are passed through unchanged (they keep their
  // source/target references; React Flow will redraw them automatically).
  return {
    nodes: resultNodes,
    edges,
  };
}

/**
 * Apply the computed layout positions to the store's nodes in-place.
 *
 * This mutates the node positions but does NOT trigger a React Flow re-render
 * — that is left to the caller (who should call setNodes with the updated list).
 */
export function applyLayoutToNodes(
  nodes: GraphNode[],
  layout: LayoutResult,
): GraphNode[] {
  const positionMap = new Map(layout.nodes.map((n) => [n.id, n]));

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    if (pos) {
      return {
        ...node,
        position: { x: Math.round(pos.x), y: Math.round(pos.y) },
      };
    }
    return node;
  });
}

/**
 * Run a full auto-layout pass and return an updated node list.
 */
export function autoLayout(nodes: GraphNode[], edges: ReactFlowEdge[]): GraphNode[] {
  const layout = computeAutoLayout(nodes, edges);
  return applyLayoutToNodes(nodes, layout);
}

/**
 * Utility: center the viewport on the given nodes.
 */
export function fitViewPosition(
  nodes: Array<{ x: number; y: number; width?: number; height?: number }>,
  padding: number = 80,
): { x: number; y: number; zoom: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    const w = node.width ?? 200;
    const h = node.height ?? 100;
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + w);
    maxY = Math.max(maxY, node.y + h);
  }

  const contentWidth = maxX - minX + padding * 2;
  const contentHeight = maxY - minY + padding * 2;

  const viewportWidth = 1200; // approximate visible area
  const viewportHeight = 800;

  const zoomX = viewportWidth / contentWidth;
  const zoomY = viewportHeight / contentHeight;
  const zoom = Math.min(zoomX, zoomY, 2);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    x: -cx * zoom + viewportWidth / 2 / zoom,
    y: -cy * zoom + viewportHeight / 2 / zoom,
    zoom,
  };
}
