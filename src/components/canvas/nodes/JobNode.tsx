"use client";

import React, { useMemo, useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Settings,
  Layers,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { JobNodeData, StepItem } from "@/types/pipeline";
import { cn, truncateMiddle, pluralize } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type JobNodeProps = Omit<NodeProps, "data"> & {
  data: {
    label: string;
    color: string;
    job?: JobNodeData;
    id: string;
  };
  selected?: boolean;
}

const JOB_COLOR = "#A3E635";

const LIVE_STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock className="w-3 h-3 text-amber-400" />,
  in_progress: <Play className="w-3 h-3 text-lime-400 animate-pulse" />,
  completed_success: <CheckCircle className="w-3 h-3 text-emerald-400" />,
  completed_failure: <XCircle className="w-3 h-3 text-red-400" />,
  cancelled: <AlertTriangle className="w-3 h-3 text-amber-500" />,
  skipped: <CheckCircle className="w-3 h-3 text-gray-500" />,
};

export default function JobNode({ data, selected }: JobNodeProps) {
  const job = data.job;
  const reactFlow = useReactFlow();

  const [isExpanded, setIsExpanded] = useState(true);
  const isPaused = false;

  if (!job) {
    return (
      <div
        className={cn(
          "relative flex flex-col w-[200px] min-w-[200px] rounded-xl bg-[#0D0F0A] border border-dashed border-gray-600",
          selected && "ring-2 ring-lime-500",
        )}
      >
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: JOB_COLOR }}
          />
          <span className="text-xs font-semibold text-white">{data.label}</span>
        </div>
        <Handle
          type="target"
          id="job-in"
          position={Position.Left}
          style={{
            width: 12,
            height: 12,
            background: JOB_COLOR,
            border: "2px solid #0D0F0A",
          }}
        />
        <Handle
          type="source"
          id="job-out"
          position={Position.Right}
          style={{
            width: 12,
            height: 12,
            background: JOB_COLOR,
            border: "2px solid #0D0F0A",
          }}
        />
        <div className="px-3 pb-3 text-[10px] text-gray-500 text-center italic">
          Empty job — add steps
        </div>
      </div>
    );
  }

  const steps: StepItem[] = useMemo(() => job.steps, [job.steps]);
  const visibleSteps = isExpanded ? steps : steps.slice(0, 2);

  const actionSteps = steps.filter((s) => s.type === "action").length;
  const runSteps = steps.filter((s) => s.type === "run").length;
  const disabledSteps = steps.filter((s) => s.disabled).length;

  const needs = useMemo(() => {
    const edgeList = reactFlow.getEdges().filter(
      (e) => e.target === data.id && e.source !== "trigger",
    );
    return edgeList.map((e) => e.source);
  }, [reactFlow, data.id]);

  const strategy = job.strategy;
  const matrixAxesCount = strategy?.matrix.axes.length ?? 0;
  const matrixInstances = useMemo(() => {
    if (!strategy) return 1;
    let count = 1;
    for (const axis of strategy.matrix.axes) {
      count *= axis.values.length;
    }
    count += strategy.matrix.include.length;
    count -= strategy.matrix.exclude.length;
    return Math.max(1, count);
  }, [strategy]);

  const estimatedHeight = 80 + steps.length * 44 + 20;

  const liveStatus = job.liveStatus;
  const liveDuration = job.liveDurationSeconds;

  return (
    <div
      className={cn(
        "relative flex flex-col w-[220px] min-w-[220px] bg-[#151A0C]/90 border-2 border-[#A3E635]/60 ",
        "shadow-lg shadow-lime-500/5",
        "hover:border-[#A3E635]/80 transition-all duration-150",
        selected ? "ring-2 ring-lime-500 ring-offset-2 ring-offset-[#0D0F0A]" : "",
        isPaused && "opacity-60",
      )}
      style={{
        borderColor: selected ? JOB_COLOR : JOB_COLOR + "99",
        height: isExpanded ? `${estimatedHeight}px` : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: JOB_COLOR }}
          />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block truncate">
              {data.label}
            </span>
            <span className="text-[10px] text-gray-400 font-mono font-normal">
              {job.jobId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Live status */}
          {liveStatus && LIVE_STATUS_ICONS[liveStatus] && (
            <div className="flex items-center gap-1 mr-1 px-1 rounded bg-black/30">
              {LIVE_STATUS_ICONS[liveStatus]}
              {liveDuration && liveStatus === "in_progress" && (
                <span className="text-[9px] text-gray-400 font-mono">
                  {Math.floor(liveDuration / 60)}m {liveDuration % 60}s
                </span>
              )}
            </div>
          )}

          {/* Needs badges */}
          {needs.length > 0 && (
            <div className="flex items-center -space-x-1 mr-1">
              {needs.slice(0, 2).map((needId, idx) => (
                <span
                  key={needId}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-[#0D0F0A] bg-lime-500/20 text-[8px] font-mono text-lime-300"
                  style={{ zIndex: 2 - idx }}
                >
                  {needId.charAt(0).toUpperCase()}
                </span>
              ))}
              {needs.length > 2 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-800 text-[8px] font-mono text-gray-400 border border-gray-700">
                  +{needs.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Expand/collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className={cn(
              "p-0.5 rounded hover:bg-lime-300/10 transition-colors",
              isExpanded ? "text-lime-400" : "text-gray-500",
            )}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-3 pb-1.5 flex items-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <Settings className="w-3 h-3" />
          {Array.isArray(job.runsOn)
            ? job.runsOn.join(", ")
            : job.runsOn}
        </span>
        {matrixAxesCount > 0 && (
          <span className="flex items-center gap-1 text-lime-400">
            <Layers className="w-3 h-3" />
            {matrixInstances}x matrix
          </span>
        )}
        {job.ifCondition && (
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            if
          </span>
        )}
        {disabledSteps > 0 && (
          <span className="text-gray-500">
            {disabledSteps} {pluralize(disabledSteps, "disabled")}
          </span>
        )}
      </div>

      {/* Steps list */}
      <div className="px-3 pb-2">
        <AnimatePresence mode="popLayout">
          {visibleSteps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              stepIndex={idx}
              isLast={idx === visibleSteps.length - 1 && idx < steps.length - 1}
            />
          ))}
        </AnimatePresence>

        {!isExpanded && steps.length > 2 && (
          <div className="flex items-center justify-center gap-2 py-1 text-[10px] text-gray-500">
            <span>+{steps.length - 2} more steps</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="text-lime-400 hover:text-lime-300 underline underline-offset-2"
            >
              Show all
            </button>
          </div>
        )}
      </div>

      {/* Footer — detect if expanded */}
      {isExpanded && steps.length > 0 && (
        <div className="flex items-center justify-between px-3 pt-0.5 border-t border-lime-500/10">
          <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
            <span>{actionSteps} actions</span>
            <span>{runSteps} scripts</span>
          </div>
          {strategy?.maxParallel !== undefined && (
            <div className="text-[9px] text-gray-500 font-mono">
              max-parallel: {strategy.maxParallel}
            </div>
          )}
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        id="job-in"
        position={Position.Left}
        className="job-handle"
        style={{
          width: 12,
          height: 12,
          background: JOB_COLOR,
          border: "2px solid #0D0F0A",
          boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.3)",
        }}
      />
      <Handle
        type="source"
        id="job-out"
        position={Position.Right}
        className="job-handle"
        style={{
          width: 12,
          height: 12,
          background: JOB_COLOR,
          border: "2px solid #0D0F0A",
          boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.3)",
        }}
      />

      {/* Selection ring */}
      {selected && (
        <motion.div
          className="absolute -inset-0.5 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(59, 130, 246, 0.5)",
              "0 0 0 4px rgba(59, 130, 246, 0)",
              "0 0 0 0 rgba(59, 130, 246, 0.5)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ zIndex: -1 }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepRow — a single step chip inside the job node
// ---------------------------------------------------------------------------

interface StepRowProps {
  step: StepItem;
  stepIndex: number;
  isLast: boolean;
}

function StepRow({
  step,
  stepIndex,
  isLast,
}: StepRowProps) {
  const displayName = step.name ?? step.uses ?? `Step ${stepIndex + 1}`;
  const isAction = step.type === "action";
  const isDisabled = step.disabled;

  const stepColor = isAction ? "#10B981" : "#F59E0B";

  return (
    <motion.div
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]",
        "transition-colors duration-100",
        isDisabled && "opacity-40",
        !isLast && "border-b border-white/5",
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Step index number */}
      <span
        className={cn(
          "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
          isDisabled ? "bg-gray-700 text-gray-400" : "",
        )}
        style={
          !isDisabled
            ? {
                background: isAction ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: isAction ? "#10B981" : "#F59E0B",
              }
            : undefined
        }
      >
        {stepIndex + 1}
      </span>

      {/* Step type indicator */}
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isDisabled ? "bg-gray-600" : "",
        )}
        style={!isDisabled ? { backgroundColor: stepColor } : undefined}
      />

      {/* Name / uses */}
      <span
        className={cn(
          "truncate text-gray-200 font-mono text-[11px]",
          step.name && !isAction && "text-gray-100 font-medium",
          isDisabled && "italic",
        )}
      >
        {isAction ? (
          <span className="text-emerald-300">{truncateMiddle(step.uses ?? "", 24)}</span>
        ) : (
          <span className="text-amber-200/80">{displayName}</span>
        )}
        {step.ifCondition && (
          <span className="ml-1 text-[9px] text-amber-400/60 font-mono">
            if
          </span>
        )}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
        {isAction && step.uses && (
          <span className="text-[9px] text-gray-500 font-mono hidden sm:inline">
            {step.uses.split("/").pop()?.split("@")[0] ?? ""}
          </span>
        )}
        {step.shell && (
          <span className="text-[9px] text-gray-500 font-mono">
            {step.shell}
          </span>
        )}
      </div>

      {/* Check / cross indicators for live status are handled at job level */}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Inline style injection for handles
// ---------------------------------------------------------------------------

const styleTag = document.createElement("style");
styleTag.textContent = `
  .job-handle {
    width: 12px !important;
    height: 12px !important;
    background: #A3E635 !important;
    border: 2px solid #0D0F0A !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
  }
  .job-handle:hover {
    transform: scale(1.25) !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5) !important;
  }
  .react-flow__handle.job-handle {
    z-index: 10 !important;
  }
`;
if (typeof document !== "undefined") {
  document.head.appendChild(styleTag);
}
