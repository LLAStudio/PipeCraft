import React from "react";
import { type EdgeProps, getBezierPath } from "@xyflow/react";
import { motion } from "framer-motion";

type DependencyEdgeProps = EdgeProps & { className?: string };

export default function DependencyEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  markerStart,
  style,
  className,
  label,
  animated,
}: DependencyEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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
