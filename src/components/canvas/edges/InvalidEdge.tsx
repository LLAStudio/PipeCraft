import React from "react";
import { type EdgeProps, getBezierPath } from "@xyflow/react";

type InvalidEdgeProps = EdgeProps & {
  id: string;
  source: string;
  target: string;
} & {
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  className?: string;
  label?: React.ReactNode;
};

export default function InvalidEdge({
  id: _id,
  source: _source,
  target: _target,
  sourcePosition,
  targetPosition,
  style,
  className,
  label,
}: InvalidEdgeProps) {
  const sx = (sourcePosition as any).x;
  const sy = (sourcePosition as any).y;
  const tx = (targetPosition as any).x;
  const ty = (targetPosition as any).y;

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition,
    targetPosition,
  } as any);

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
        <text pointerEvents="none" x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#EF4444">
          {String(label)}
        </text>
      )}
    </g>
  );
}
