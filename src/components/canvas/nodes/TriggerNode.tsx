"use client";

import React, { useMemo, useRef } from "react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { Play, GitPullRequest, Clock, Cpu, ChevronRight } from "lucide-react";
import type { TriggerNodeData } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type TriggerNodeProps = Omit<NodeProps, "data"> & {
  data: {
    label: string;
    color: string;
    trigger?: TriggerNodeData;
    id: string;
  };
}

const TRIGGER_COLOR = "#FACC15";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  push: <GitPullRequest className="w-3.5 h-3.5" />,
  pull_request: <GitPullRequest className="w-3.5 h-3.5" />,
  pull_request_target: <GitPullRequest className="w-3.5 h-3.5" />,
  release: <Play className="w-3.5 h-3.5" />,
  schedule: <Clock className="w-3.5 h-3.5" />,
  workflow_dispatch: <Cpu className="w-3.5 h-3.5" />,
  workflow_call: <Cpu className="w-3.5 h-3.5" />,
  issues: <Play className="w-3.5 h-3.5" />,
  repository_dispatch: <Cpu className="w-3.5 h-3.5" />,
};

const EVENT_LABELS: Record<string, string> = {
  push: "Push",
  pull_request: "Pull Request",
  pull_request_target: "Pull Request (target)",
  release: "Release",
  schedule: "Schedule (cron)",
  workflow_dispatch: "Manual",
  workflow_call: "Reusable Call",
  issues: "Issues",
  repository_dispatch: "Repository Dispatch",
};

export default function TriggerNode({ data, selected }: TriggerNodeProps) {
  const trigger = data.trigger;
  const nodeRef = useRef<HTMLDivElement>(null);

  const eventSummary = useMemo(() => {
    if (!trigger) return [];
    return trigger.events
      .filter((e) => EVENT_LABELS[e] || e)
      .slice(0, 4)
      .map((e) => ({
        event: e,
        label: EVENT_LABELS[e] || e,
        icon: EVENT_ICONS[e] || <Cpu className="w-3.5 h-3.5" />,
      }));
  }, [trigger]);

  const totalEvents = trigger?.events.length ?? 0;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "relative flex flex-col w-[180px] min-w-[180px] bg-[#1E1B0E] border-2 border-[#FACC15]/60 rounded-xl",
        "shadow-lg shadow-yellow-500/5",
        "hover:border-[#FACC15]/80 transition-all duration-150",
        selected ? "ring-2 ring-[#FACC15] ring-offset-2 ring-offset-[#0D0F0A]" : "",
        "cursor-pointer",
      )}
      style={{
        borderColor: selected ? TRIGGER_COLOR : TRIGGER_COLOR + "99",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: TRIGGER_COLOR }}
          />
          <span className="text-xs font-semibold tracking-tight text-white">
            {data.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-yellow-300/60 bg-yellow-500/10 px-1.5 py-0.5 rounded">
          TRIGGER
        </span>
      </div>

      {/* Events summary */}
      {trigger && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <AnimatePresence>
              {eventSummary.map((item, idx) => (
                <motion.span
                  key={item.event}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}
                  className="inline-flex items-center gap-1 rounded-md bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300 font-mono"
                >
                  {item.icon}
                  {item.label}
                </motion.span>
              ))}
            </AnimatePresence>
            {totalEvents > 4 && (
              <span className="text-[10px] text-yellow-400/50 font-mono">
                +{totalEvents - 4}
              </span>
            )}
          </div>

          {/* Details */}
          <details className="group">
            <summary className="text-[10px] text-yellow-400/40 cursor-pointer select-none hover:text-yellow-300/60 transition-colors list-none flex items-center gap-1">
              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
              Configure
            </summary>
            <div className="mt-1 space-y-0.5 text-[10px] text-yellow-300/60 font-mono leading-relaxed">
              {trigger.events.includes("push") && (
                <div>push: {trigger.pushConfig.branches.length > 0 ? `branches: [${trigger.pushConfig.branches.join(", ")}]` : "any branch"}</div>
              )}
              {trigger.events.includes("pull_request") && (
                <div>PR: {trigger.pullRequestConfig.types.join(", ")}</div>
              )}
              {trigger.events.includes("workflow_dispatch") && trigger.workflowDispatchInputs.length > 0 && (
                <div>dispatch inputs: {trigger.workflowDispatchInputs.length}</div>
              )}
              {trigger.events.includes("schedule") && trigger.scheduleConfig.length > 0 && (
                <div>cron: {trigger.scheduleConfig[0]?.cron ?? ""}</div>
              )}
              {trigger.events.includes("workflow_call") && (
                <div>call inputs: {Object.keys(trigger.workflowCallConfig.inputs).length}</div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Output handle */}
      <Handle
        type="source"
        id="trigger-out"
        position={Position.Right}
        className="trigger-handle"
        style={{
          width: 12,
          height: 12,
          background: TRIGGER_COLOR,
          border: "2px solid #0D0F0A",
          boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.3)",
        }}
      />

      {/* Glow pulse when selected */}
      {selected && (
        <motion.div
          className="absolute -inset-0.5 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(139, 92, 246, 0.4)",
              "0 0 0 4px rgba(139, 92, 246, 0)",
              "0 0 0 0 rgba(139, 92, 246, 0.4)",
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

// CSS-in-JS for the handle (required because React Flow's CSS is not
// easily overridable inline)
const style = document.createElement("style");
style.textContent = `
  .trigger-handle {
    width: 12px !important;
    height: 12px !important;
    background: #FACC15 !important;
    border: 2px solid #0D0F0A !important;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3) !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
  }
  .trigger-handle:hover {
    transform: scale(1.25) !important;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.5) !important;
  }
  .react-flow__handle.trigger-handle {
    z-index: 10 !important;
  }
`;
if (typeof document !== "undefined") {
  document.head.appendChild(style);
}
