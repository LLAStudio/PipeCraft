"use client";

import React from "react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { GitBranch, RefreshCw, Lock, Unlock, ExternalLink } from "lucide-react";
import type { ReusableWorkflowNodeData } from "@/types/pipeline";
import { cn, truncateMiddle } from "@/lib/utils";
import { motion } from "framer-motion";

type ReusableWorkflowNodeProps = Omit<NodeProps, "data"> & {
  data: {
    label: string;
    color: string;
    reusableWorkflow?: ReusableWorkflowNodeData;
    id: string;
  };
  selected?: boolean;
}

const RW_COLOR = "#94A3B8";

export default function ReusableWorkflowNode({ data, selected }: ReusableWorkflowNodeProps) {
  const reusable = data.reusableWorkflow;

  if (!reusable) {
    return (
      <div
        className={cn(
          "relative flex flex-col w-[200px] min-w-[200px] rounded-xl bg-[#0D0F0A] border border-dashed border-gray-600",
          selected && "ring-2 ring-lime-500",
        )}
      >
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: RW_COLOR }}
          />
          <span className="text-xs font-semibold text-white">{data.label}</span>
        </div>
        <Handle
          type="target"
          id="job-in"
          position={Position.Left}
          style={{ width: 12, height: 12, background: RW_COLOR }}
        />
        <Handle
          type="source"
          id="job-out"
          position={Position.Right}
          style={{ width: 12, height: 12, background: RW_COLOR }}
        />
        <div className="px-3 pb-2 text-[10px] text-gray-500 text-center italic">
          New reusable workflow
        </div>
      </div>
    );
  }

  const uses = reusable.uses;
  const isLocal = uses.startsWith("./") || uses.startsWith("../");
  const isRemote = !isLocal && uses.includes("/");
  const withCount = Object.keys(reusable.with).length;
  const secretsConfig = reusable.secrets;
  const hasSecrets = secretsConfig !== "inherit" && typeof secretsConfig === "object" && Object.keys(secretsConfig).length > 0;

  return (
    <div
      className={cn(
        "relative flex flex-col w-[210px] min-w-[210px] rounded-xl bg-[#181C1B]/90 border-2 border-[#94A3B8]/60 ",
        "shadow-lg shadow-lime-500/5",
        "hover:border-[#94A3B8]/80 transition-all duration-150",
        selected ? "ring-2 ring-lime-500 ring-offset-2 ring-offset-[#0D0F0A]" : "",
      )}
      style={{
        borderColor: selected ? RW_COLOR : RW_COLOR + "99",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: RW_COLOR }}
          />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block truncate">
              {data.label}
            </span>
            <span className="text-[10px] text-lime-300/60 font-mono font-normal">
              {reusable.jobId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {reusable.ifCondition && (
            <span className="text-[9px] text-amber-400/70 font-mono bg-amber-500/10 px-1 rounded">
              if
            </span>
          )}
          <RefreshCw className="w-3 h-3 text-lime-400" />
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pb-2 space-y-2">
        {/* Uses */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <GitBranch className="w-3 h-3 text-lime-400/60 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-gray-400 font-mono truncate block">
              {truncateMiddle(uses, 36)}
            </span>
            <span className="text-[9px] text-gray-500">
              {isLocal ? "local" : isRemote ? "distant" : "inline"}
            </span>
          </div>
          {isRemote && (
            <ExternalLink className="w-3 h-3 text-lime-400/40 flex-shrink-0 ml-auto" />
          )}
        </div>

        {/* With parameters */}
        {withCount > 0 && (
          <div className="text-[10px] text-gray-400">
            <div className="text-gray-500 font-mono mb-0.5">with:</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-400 font-mono">
              {Object.entries(reusable.with).slice(0, 4).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 truncate">
                  <span className="text-lime-400/60 flex-shrink-0">{k}:</span>
                  <span className="truncate text-gray-300">{truncateMiddle(String(v), 20)}</span>
                </div>
              ))}
              {Object.keys(reusable.with).length > 4 && (
                <div className="text-gray-500 col-span-2 text-[9px]">
                  +{Object.keys(reusable.with).length - 4} more params
                </div>
              )}
            </div>
          </div>
        )}

        {/* Secrets */}
        <div className="text-[10px] text-gray-400">
          <div className="text-gray-500 font-mono mb-0.5 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            secrets:
          </div>
          {secretsConfig === "inherit" ? (
            <div className="text-lime-400/70 font-mono text-[10px] flex items-center gap-1">
              <Unlock className="w-2.5 h-2.5" />
              inherit
            </div>
          ) : hasSecrets ? (
            <div className="text-gray-400 font-mono">
              {Object.keys(secretsConfig).length} secret{Object.keys(secretsConfig).length > 1 ? "s" : ""}
              {Object.entries(secretsConfig).slice(0, 2).map(([k]) => (
                <span key={k} className="text-gray-500 block truncate">
                  {" "}
                  • {k}
                </span>
              ))}
              {Object.keys(secretsConfig).length > 2 && (
                <span className="text-gray-500 text-[9px]">
                  +{Object.keys(secretsConfig).length - 2} more
                </span>
              )}
            </div>
          ) : (
            <div className="text-gray-500 font-mono text-[10px]">
              (none)
            </div>
          )}
        </div>

        {/* Permissions */}
        {reusable.permissions && typeof reusable.permissions !== "string" && (
          <div className="text-[10px] text-gray-500">
            permissions:{" "}
            {Object.entries(reusable.permissions as Record<string, string>)
              .filter(([, v]) => v)
              .slice(0, 3)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")}
            {(reusable.permissions as Record<string, string>).write === "write" && (
              <span className="text-amber-400/70 ml-1">⚠ write</span>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        id="job-in"
        position={Position.Left}
        style={{
          width: 12,
          height: 12,
          background: RW_COLOR,
          border: "2px solid #0D0F0A",
          boxShadow: "0 0 0 2px rgba(6, 182, 212, 0.3)",
        }}
      />
      <Handle
        type="source"
        id="job-out"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          background: RW_COLOR,
          border: "2px solid #0D0F0A",
          boxShadow: "0 0 0 2px rgba(6, 182, 212, 0.3)",
        }}
      />

      {/* Selection glow */}
      {selected && (
        <motion.div
          className="absolute -inset-0.5 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(6, 182, 212, 0.5)",
              "0 0 0 4px rgba(6, 182, 212, 0)",
              "0 0 0 0 rgba(6, 182, 212, 0.5)",
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
