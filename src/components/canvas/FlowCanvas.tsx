"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  type OnMoveEnd,
} from "@xyflow/react";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { usePipelineStore } from "@/store/usePipelineStore";
import { validateEdgeConnection } from "@/components/canvas/ConnectionValidator";
import DependencyEdge from "@/components/canvas/edges/DependencyEdge";
import InvalidEdge from "@/components/canvas/edges/InvalidEdge";
import TriggerNode from "@/components/canvas/nodes/TriggerNode";
import JobNode from "@/components/canvas/nodes/JobNode";
import StepNode from "@/components/canvas/nodes/StepNode";
import ReusableWorkflowNode from "@/components/canvas/nodes/ReusableWorkflowNode";
import ConditionBadge from "@/components/canvas/nodes/ConditionBadge";

const nodeTypes = {
  trigger: TriggerNode,
  job: JobNode,
  step: StepNode,
  reusable_workflow: ReusableWorkflowNode,
  condition_badge: ConditionBadge,
} as unknown as NodeTypes;

const edgeTypes = {
  dependency: DependencyEdge,
  invalid: InvalidEdge,
} as unknown as EdgeTypes;

/** Fits the graph once React Flow has measured the custom nodes. */
function AutoFit({ enabled }: { enabled: boolean }) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || !nodesInitialized || done.current) return;
    done.current = true;
    // The flex shell around the canvas settles a frame or two after mount;
    // refitting once more avoids fitting against the pre-layout width.
    const timers = [80, 450].map((delay) =>
      setTimeout(() => {
        void fitView({ padding: 0.15, duration: 0 });
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [enabled, nodesInitialized, fitView]);

  return null;
}

interface FlowCanvasProps {
  /** Fit the graph to the viewport on mount (templates, sandbox) instead of restoring a saved viewport. */
  autoFit?: boolean;
}

export default function FlowCanvas({ autoFit = false }: FlowCanvasProps) {
  const nodes = usePipelineStore((state) => state.nodes);
  const edges = usePipelineStore((state) => state.edges);
  const viewport = usePipelineStore((state) => state.viewport);
  const setNodes = usePipelineStore((state) => state.setNodes);
  const setEdges = usePipelineStore((state) => state.setEdges);
  const setViewport = usePipelineStore((state) => state.setViewport);
  const setSelectedNodeId = usePipelineStore((state) => state.setSelectedNodeId);
  const selectedNodeId = usePipelineStore((state) => state.selectedNodeId);


  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data as unknown as Record<string, unknown>,
        selected: node.id === selectedNodeId,
        ...(node.parentId ? { parentId: node.parentId, extent: "parent" as const } : {}),
      })),
    [nodes, selectedNodeId],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        type: edge.type ?? "dependency",
        animated: edge.type !== "invalid",
        ...(edge.label ? { label: edge.label } : {}),
      })),
    [edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!validateEdgeConnection(connection, flowNodes, flowEdges)) return;
      setEdges([
        ...edges,
        {
          id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
          type: "dependency",
        },
      ]);
    },
    [edges, flowEdges, flowNodes, setEdges],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      setNodes(
        nodes.map((candidate) =>
          candidate.id === node.id ? { ...candidate, position: node.position } : candidate,
        ),
      );
    },
    [nodes, setNodes],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const ids = new Set(deleted.map((node) => node.id));
      setNodes(nodes.filter((node) => !ids.has(node.id)));
      setEdges(edges.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)));
    },
    [edges, nodes, setEdges, setNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const ids = new Set(deleted.map((edge) => edge.id));
      setEdges(edges.filter((edge) => !ids.has(edge.id)));
    },
    [edges, setEdges],
  );

  const onMoveEnd: OnMoveEnd = useCallback(
    (_event, nextViewport) => setViewport(nextViewport),
    [setViewport],
  );

  return (
    <div className="h-full w-full bg-[#0D0F0A]">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        {...(autoFit ? { fitView: true } : { defaultViewport: viewport })}
        onConnect={onConnect}
        onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onMoveEnd={onMoveEnd}
        defaultEdgeOptions={{ type: "dependency", animated: true }}
        connectionLineStyle={{ stroke: "#A3E635", strokeWidth: 2 }}
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={2}
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-[#0D0F0A]"
      >
        <AutoFit enabled={autoFit} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2A3022" />
        <Controls
          className="!bg-[#131610] !border !border-[#2A3022] !rounded-lg !shadow-lg !shadow-black/40 !text-gray-300 [&>button]:!bg-[#131610] [&>button]:!text-gray-300 [&>button]:!border-[#2A3022] [&>button:hover]:!bg-[#2A3022] [&>button:hover]:!text-white"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
