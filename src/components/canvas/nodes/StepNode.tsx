"use client";

import React from "react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { ChevronDown } from "lucide-react";
import type { StepItem } from "@/types/pipeline";
import { cn, truncateMiddle } from "@/lib/utils";

type StepNodeProps = Omit<NodeProps, "data"> & {
  data: {
    label: string;
    color: string;
    step?: StepItem;
    id: string;
  };
  selected?: boolean;
}

const STEP_COLOR = "#2DD4BF";

export default function StepNode({ data, selected }: StepNodeProps) {
  const step = data.step;
  const isAction = step?.type === "action";
  const isScript = step?.type === "run";
  const isDisabled = step?.disabled ?? false;

  if (!step) {
    return (
      <div
        className={cn(
          "relative flex flex-col w-[160px] min-w-[160px] rounded-xl bg-[#0D0F0A] border border-dashed border-gray-600",
          selected && "ring-2 ring-emerald-500",
        )}
      >
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STEP_COLOR }}
          />
          <span className="text-xs font-semibold text-white">Step</span>
        </div>
        <Handle
          type="target"
          id="step-in"
          position={Position.Left}
          style={{ width: 8, height: 8, background: STEP_COLOR }}
        />
        <Handle
          type="source"
          id="step-out"
          position={Position.Right}
          style={{ width: 8, height: 8, background: STEP_COLOR }}
        />
        <div className="px-3 pb-2 text-[10px] text-gray-500 text-center italic">
          New step
        </div>
      </div>
    );
  }

  const displayName = step.name ?? step.uses ?? "Step";

  return (
    <div
      className={cn(
        "relative flex flex-col w-[170px] min-w-[170px] rounded-xl",
        isAction
          ? "bg-emerald-900/20 border-2 border-emerald-500/50"
          : "bg-amber-900/15 border-2 border-amber-500/40",
        "shadow-md",
        isDisabled && "opacity-40",
        selected && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0D0F0A]",
      )}
      style={{
        borderColor: isDisabled ? undefined : selected ? "#10B981" : (isAction ? "#10B981" : "#F59E0B") + "88",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: isAction ? STEP_COLOR : "#F59E0B" }}
          />
          <span className="text-[11px] font-semibold text-white truncate">
            {displayName}
          </span>
        </div>

        <span
          className={cn(
            "text-[9px] font-mono px-1 py-0.5 rounded",
            isAction
              ? "bg-teal-500/15 text-teal-300"
              : "bg-amber-500/15 text-amber-300",
          )}
        >
          {isAction ? "ACTION" : "SCRIPT"}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 pb-2 space-y-1">
        {/* Action details */}
        {isAction && step.uses && (
          <div className="pl-4 border-l-2 border-emerald-500/20">
            <div className="text-[9px] text-gray-400 font-mono truncate">
              <span className="text-teal-400/60">uses:</span>
              {" "}
              {truncateMiddle(step.uses, 32)}
            </div>
            {step.with && Object.keys(step.with).length > 0 && (
              <div className="mt-0.5 text-[9px] text-gray-500 font-mono">
                with:
                {Object.entries(step.with)
                  .slice(0, 2)
                  .map(([k, v]) => ` ${k}: ${v}`)
                  .join(", ")}
                {Object.keys(step.with).length > 2 && " …"}
              </div>
            )}
          </div>
        )}

        {/* Script details */}
        {isScript && step.run && (
          <div className="pl-4 border-l-2 border-amber-500/20">
            <div className="text-[9px] text-gray-300 font-mono leading-relaxed max-h-14 overflow-hidden">
              <span className="text-amber-400/60">run:</span>{" "}
              {step.run.split("\n").slice(0, 2).join("\n")}
              {step.run.split("\n").length > 2 && (
                <span className="text-gray-500">
                  {"\n"}
                  … +{step.run.split("\n").length - 2} lines
                </span>
              )}
            </div>
            {step.shell && (
              <div className="mt-0.5 text-[9px] text-gray-500 font-mono">
                shell: {step.shell}
              </div>
            )}
          </div>
        )}

        {/* Common fields */}
        <div className="flex flex-wrap gap-1 mt-1">
          {step.ifCondition && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400/70 font-mono bg-amber-500/10 px-1 rounded">
              <ChevronDown className="w-2.5 h-2.5" />
              if
            </span>
          )}
          {step.stepId && step.stepId !== step.id && (
            <span className="text-[9px] text-lime-400/70 font-mono bg-lime-500/10 px-1 rounded">
              id: {step.stepId}
            </span>
          )}
          {step.workingDirectory && (
            <span className="text-[9px] text-gray-400 font-mono">
              cwd: {step.workingDirectory}
            </span>
          )}
          {!isDisabled && step.continueOnError && (
            <span className="text-[9px] text-amber-400/70 font-mono">
              continue-on-error
            </span>
          )}
        </div>

        {/* Env / with summary */}
        {(step.env && Object.keys(step.env).length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(step.env).slice(0, 2).map(([k, v]) => (
              <span
                key={k}
                className="text-[9px] text-gray-400 font-mono bg-white/5 px-1 rounded"
              >
                {k}: {truncateMiddle(v, 12)}
              </span>
            ))}
            {Object.keys(step.env).length > 2 && (
              <span className="text-[9px] text-gray-500 font-mono">
                +{Object.keys(step.env).length - 2} env
              </span>
            )}
          </div>
        )}
      </div>

      {/* Disabled badge */}
      {isDisabled && (
        <div className="absolute -top-1.5 right-2 text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
          DISABLED
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        id="step-in"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: isDisabled ? "#4B5563" : STEP_COLOR,
          border: "1px solid #0D0F0A",
        }}
      />
      <Handle
        type="source"
        id="step-out"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          background: isDisabled ? "#4B5563" : STEP_COLOR,
          border: "1px solid #0D0F0A",
        }}
      />
    </div>
  );
}
