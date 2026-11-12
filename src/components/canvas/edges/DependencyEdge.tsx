import React from "react";
import { type EdgeProps, getBezierPath } from "@xyflow/react";
import { motion } from "framer-motion";

type DependencyEdgeProps = EdgeProps & {
  id: string;
  source: string;
  target: string;
} & {
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  className?: string;
  label?: React.ReactNode;
  animated?: boolean;
};

export default function DependencyEdge({
  id: _id,
  source: _source,
  target: _target,
  sourcePosition,
  targetPosition,
  markerEnd,
  markerStart,
  style,
  className,
  label,
  animated,
}: DependencyEdgeProps) {
  const sx = (sourcePosition as any).x;
  const sy = (sourcePosition as any).y;
  const tx = (targetPosition as any).x;
  const ty = (targetPosition as any).y;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition,
    targetPosition,
  } as any);

  if (animated) {
    return (
      <motion.g style={{ position: "absolute", pointerEvents: "none", overflow: "visible" }}>
        <path
          style={{ pointerEvents: "none", position: "absolute", overflow: "visible", ...style }}
          d={edgePath}
          fill="none"
          stroke="#A3E635"
          strokeWidth={2}
          markerEnd={markerEnd}
          markerStart={markerStart}
        />
        {label && (
          <text pointerEvents="none" x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle">
            {String(label)}
          </text>
        )}
      </motion.g>
    );
  }

  return (
    <g className={className} style={{ position: "absolute", pointerEvents: "none", overflow: "visible" }}>
      <path d={edgePath} fill="none" stroke="#A3E635" strokeWidth={2} markerEnd={markerEnd} markerStart={markerStart} />
      {label && (
        <text pointerEvents="none" x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle">
          {String(label)}
        </text>
      )}
    </g>
  );
}
