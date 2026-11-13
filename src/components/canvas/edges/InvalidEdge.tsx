import React from "react";
import { type EdgeProps, getBezierPath } from "@xyflow/react";

type InvalidEdgeProps = EdgeProps & { className?: string };

export default function InvalidEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  className,
  label,
}: InvalidEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g
      className={className}
      style={{ position: "absolute", pointerEvents: "none", overflow: "visible" }}
    >
      <path
        d={edgePath}
        fill="none"
        stroke="#EF4444"
        strokeWidth={2}
        strokeDasharray="8 4"
        style={{ pointerEvents: "none", position: "absolute", overflow: "visible", ...style }}
      />
      {label && (
        <text pointerEvents="none" x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="#EF4444">
          {String(label)}
        </text>
      )}
    </g>
  );
}
