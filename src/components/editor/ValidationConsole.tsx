"use client";

import React, { useMemo } from "react";
import {
  FileCheck,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Zap,
  Wrench,
} from "lucide-react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { validateGraphSummary } from "@/lib/validation/graphValidator";
import { lintSecurity } from "@/lib/validation/securityLinter";
import { validateYamlString } from "@/lib/validation/schemaValidator";
import { calculateFinopsSafe } from "@/lib/compiler/finopsCalculator";
import type { FinOpsEstimate, GraphValidationSummary, SecurityAlert } from "@/types/pipeline";
import type { SchemaValidationResult } from "@/lib/validation/schemaValidator";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ValidationConsoleProps {
  activeTab: "errors" | "security" | "finops";
  onTabChange: (tab: "errors" | "security" | "finops") => void;
  onNodeClick?: (nodeId: string) => void;
  onAutoFix?: ((nodeId: string, alertRule: string) => void) | undefined;
}

export default function ValidationConsole({
  activeTab,
  onTabChange,
  onNodeClick,
  onAutoFix,
}: ValidationConsoleProps) {
  const store = usePipelineStore();

  // Compute all validations
  const validation = useMemo(() => {
    const graphErrors = validateGraphSummary(store.nodes, store.edges);
    const { score: securityScore, alerts: securityAlerts } = lintSecurity(
      store.nodes,
      store.globalSettings,
    );
    const finops = calculateFinopsSafe(store.nodes);
    const yamlText = graphToYaml({
      nodes: store.nodes,
      edges: store.edges,
      globalSettings: store.globalSettings,
      viewport: store.viewport,
    });
    const schemaValidation = validateYamlString(yamlText);

    return {
      graphErrors,
      securityScore,
      securityAlerts,
      finops,
      schemaValidation,
      yamlText,
    };
  }, [store.nodes, store.edges, store.globalSettings, store.viewport]);

  return (
    <div className="flex flex-col h-full bg-[#0D0F0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A3022] bg-[#131610]">
        <div className="flex gap-1">
          {[
            { key: "errors", label: "Errors", icon: FileCheck, color: "text-red-400" },
            { key: "security", label: "Security", icon: Shield, color: "text-amber-400" },
            { key: "finops", label: "Cost", icon: DollarSign, color: "text-emerald-400" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-lime-500/20 text-lime-300"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">
            YAML: {validation.schemaValidation.valid ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3" /> Valide
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Invalid
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {activeTab === "errors" && (
            <ErrorsTab key="errors" validation={validation} onNodeClick={onNodeClick} />
          )}
          {activeTab === "security" && (
            <SecurityTab key="security" validation={validation} onAutoFix={onAutoFix} />
          )}
          {activeTab === "finops" && (
            <FinOpsTab key="finops" validation={validation} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Errors Tab
// ---------------------------------------------------------------------------

interface ErrorsTabProps {
  validation: ValidationData;
  onNodeClick?: ((nodeId: string) => void) | undefined;
}

type ValidationData = {
  graphErrors: GraphValidationSummary;
  securityScore: number;
  securityAlerts: SecurityAlert[];
  finops: FinOpsEstimate;
  schemaValidation: SchemaValidationResult & { parseError?: string | undefined };
  yamlText: string;
};

function ErrorsTab({ validation, onNodeClick }: ErrorsTabProps) {
  const errors = validation.graphErrors;

  if (errors.errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
        <div className="text-sm text-emerald-400 font-medium mb-1">Pipeline valid</div>
        <div className="text-xs text-gray-500 max-w-xs">
          No structural errors detected. The graph is ready to compile to YAML.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-300">
            {errors.errorCount} error{errors.errorCount !== 1 ? "s" : ""}
          </span>
          {errors.warningCount > 0 && (
            <span className="text-amber-400 ml-2">
              {errors.warningCount} avertissement{errors.warningCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="text-[10px] text-gray-500">
          Click an error to center the affected node
        </div>

        <div className="flex gap-1">
          {errors.errors.slice(0, 3).map((err, idx) => (
            <button
              key={idx}
              onClick={() => onNodeClick?.(err.nodeId ?? "")}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1D2117] border border-[#2A3022] text-[10px] text-gray-400 hover:text-white hover:border-gray-600 transition-colors max-w-[140px]"
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                err.severity === "error" ? "bg-red-400" : "bg-amber-400",
              )} />
              <span className="truncate font-mono">{err.message}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {errors.errors.map((err, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "flex items-start gap-2 p-3 rounded-lg border text-xs cursor-pointer transition-colors hover:border-opacity-50",
              err.severity === "error"
                ? "bg-red-500/5 border-red-500/20 text-red-300 hover:bg-red-500/10"
                : err.severity === "warning"
                ? "bg-amber-500/5 border-amber-500/20 text-amber-300 hover:bg-amber-500/10"
                : "bg-lime-500/5 border-lime-500/20 text-lime-300 hover:bg-lime-300/10",
            )}
            onClick={() => onNodeClick?.(err.nodeId ?? "")}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                err.severity === "error" ? "bg-red-500/20" : "bg-amber-500/20",
              )}
            >
              <AlertTriangle
                className={cn("w-3.5 h-3.5", err.severity === "error" ? "text-red-400" : "text-amber-400")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[10px] text-gray-500">{err.code}</span>
                {err.nodeId && (
                  <span className="text-[10px] text-gray-500">· nœud: {err.nodeId}</span>
                )}
                {err.stepIndex !== undefined && (
                  <span className="text-[10px] text-gray-500">· step #{err.stepIndex + 1}</span>
                )}
              </div>
              <p className="text-gray-300 leading-relaxed">{err.message}</p>
            </div>
            {err.nodeId && (
              <button
                onClick={() => onNodeClick?.(err.nodeId as string)}
                className="p-1 rounded bg-lime-500/15 text-lime-300 hover:bg-lime-300/25 transition-colors flex-shrink-0"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security Tab
// ---------------------------------------------------------------------------

interface SecurityTabProps {
  validation: ValidationData;
  onAutoFix?: ((nodeId: string, alertRule: string) => void) | undefined;
}

function SecurityTab({ validation, onAutoFix }: SecurityTabProps) {
  const { securityScore, securityAlerts } = validation;

  if (securityAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Shield className="w-10 h-10 text-emerald-500 mb-3" />
        <div className="text-sm text-emerald-400 font-medium mb-1">
          Security score: {securityScore}/100
        </div>
        <div className="text-xs text-gray-500 max-w-xs">
          No DevSecOps alerts detected. The pipeline follows security best practices.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Score header */}
      <div className="flex items-center gap-3 p-3 rounded-lg border" style={{
        borderColor: securityScore >= 80 ? "#10B98140" : securityScore >= 60 ? "#F59E0B40" : "#EF444440",
        backgroundColor: securityScore >= 80 ? "rgba(16, 185, 129, 0.05)" : securityScore >= 60 ? "rgba(245, 158, 11, 0.05)" : "rgba(239, 68, 68, 0.05)",
      }}>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono" style={{
            color: securityScore >= 80 ? "#10B981" : securityScore >= 60 ? "#F59E0B" : "#EF4444",
          }}>
            {securityScore}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">/ 100</div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-gray-200">DevSecOps alerts</span>
          </div>
          <div className="text-[10px] text-gray-500">
            {securityAlerts.filter((a) => a.severity === "critical").length} critical ·
            {securityAlerts.filter((a) => a.severity === "warning").length} warnings ·
            {securityAlerts.filter((a) => a.severity === "info").length} info
          </div>
        </div>
        <div className="flex gap-1">
          {securityAlerts.slice(0, 2).map((alert, idx) => (
            <button
              key={idx}
              onClick={() => onAutoFix?.(alert.nodeId ?? "", alert.rule)}
              className="px-2 py-1 rounded text-[9px] font-mono bg-[#1D2117] border border-[#2A3022] text-gray-400 hover:text-white hover:border-gray-600 transition-colors max-w-[100px]"
            >
              {alert.rule}
            </button>
          ))}
        </div>
      </div>

      {/* Alert details */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {securityAlerts.map((alert, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex items-start gap-2 p-3 rounded-lg border text-xs",
              alert.severity === "critical"
                ? "bg-red-500/5 border-red-500/20 text-red-300"
                : alert.severity === "warning"
                ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                : "bg-lime-500/5 border-lime-500/20 text-lime-300",
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                alert.severity === "critical" ? "bg-red-500/20" : "bg-amber-500/20",
              )}
            >
              <AlertTriangle
                className={cn("w-3.5 h-3.5", alert.severity === "critical" ? "text-red-400" : "text-amber-400")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[10px] text-gray-500">{alert.rule}</span>
                <span className={cn(
                  "text-[9px] px-1 py-0.5 rounded",
                  alert.severity === "critical" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400",
                )}>
                  -{alert.pointsDeducted} pts
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed">{alert.message}</p>
              {alert.autoFixDescription && (
                <div className="mt-1.5 p-1.5 bg-[#1D2117] border border-[#2A3022] rounded text-[10px] text-gray-400">
                  <span className="text-lime-400 font-medium">Auto-fix:</span>{" "}
                  <span className="text-gray-300">{alert.autoFixDescription}</span>
                </div>
              )}
            </div>
            {onAutoFix && (
              <button
                onClick={() => onAutoFix("", alert.rule)}
                className="p-1.5 rounded bg-lime-500/15 text-lime-300 hover:bg-lime-300/25 transition-colors flex-shrink-0 mt-0.5"
                title="Apply auto-fix"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FinOps Tab
// ---------------------------------------------------------------------------

interface FinOpsTabProps {
  validation: ValidationData;
}

function FinOpsTab({ validation }: FinOpsTabProps) {
  const finops = validation.finops;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="p-4 rounded-xl bg-[#0D0F0A] border border-[#2A3022]">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            GitHub runner estimate
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1D2117] rounded-lg p-3 border border-[#2A3022]">
            <div className="text-[10px] text-gray-500 mb-1">Billed minutes (total)</div>
            <div className="text-2xl font-bold text-white font-mono">
              {finops.totalMinutes > 0 ? `${finops.totalMinutes.toFixed(1)}m` : "0m"}
            </div>
          </div>

          <div className="bg-[#1D2117] rounded-lg p-3 border border-[#2A3022]">
            <div className="text-[10px] text-gray-500 mb-1">Estimated GitHub charge (after free quota)</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {finops.costInCents > 0 ? `$${finops.costInCents.toFixed(2)}` : "~$0"}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#2A3022] text-[10px] text-amber-300/80 text-center">
          GitHub Actions runner billing estimate only — PipeCraft is free and never charges you.
        </div>

        <div className="mt-2 text-[10px] text-gray-500 text-center">
          GitHub Actions multipliers: Linux 1x ($0.008/min) · Windows 2x · macOS 10x · Self-hosted 0x
        </div>
      </div>

      {/* Platform breakdown */}
      <div>
        <div className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          By platform
        </div>
        <div className="grid grid-cols-4 gap-2">
          <PlatformCard
            platform="linux"
            label="Linux"
            minutes={finops.linuxMinutes}
            multiplier={1}
            color="text-emerald-400"
            bgColor="bg-emerald-500/5 border-emerald-500/15"
          />
          <PlatformCard
            platform="windows"
            label="Windows"
            minutes={finops.windowsMinutes}
            multiplier={2}
            color="text-lime-400"
            bgColor="bg-lime-500/5 border-lime-500/15"
          />
          <PlatformCard
            platform="macos"
            label="macOS"
            minutes={finops.macosMinutes}
            multiplier={10}
            color="text-amber-400"
            bgColor="bg-amber-500/5 border-amber-500/15"
          />
          <PlatformCard
            platform="self-hosted"
            label="Self-hosted"
            minutes={finops.selfHostedMinutes}
            multiplier={0}
            color="text-yellow-400"
            bgColor="bg-yellow-500/5 border-yellow-500/15"
          />
        </div>
      </div>

      {/* Matrix breakdown */}
      {finops.matrixBreakdown.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
            <LayersIcon className="w-3.5 h-3.5" />
            Per-job breakdown (matrices)
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {finops.matrixBreakdown.map((item) => (
              <div
                key={item.jobId}
                className="flex items-center justify-between p-2.5 bg-[#1D2117] border border-[#2A3022] rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-gray-300 truncate">{item.name}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded flex-shrink-0",
                      item.platform === "macos" ? "bg-amber-500/15 text-amber-400" :
                      item.platform === "windows" ? "bg-lime-500/15 text-lime-400" :
                      item.platform === "self-hosted" ? "bg-yellow-500/15 text-yellow-400" :
                      "bg-emerald-500/15 text-emerald-400",
                    )}
                  >
                    {item.platform}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {item.instances}x
                  </span>
                  <span className="text-xs font-mono text-gray-300">
                    {item.estimatedMinutes.toFixed(1)}m
                  </span>
                  {item.multiplier > 1 && (
                    <span className="text-[9px] text-amber-400 font-mono">
                      ×{item.multiplier}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick reference */}
      <div className="p-3 bg-[#1D2117] border border-[#2A3022] rounded-lg">
        <div className="text-[10px] text-gray-500 font-medium mb-2 uppercase tracking-wider">
          Quick cost reference
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">ubuntu-latest (Linux)</span>
            <span className="text-emerald-400 font-mono">1x · $0.008/min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">windows-latest</span>
            <span className="text-lime-400 font-mono">2x · $0.016/min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">macos-latest</span>
            <span className="text-amber-400 font-mono">10x · $0.08/min</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">self-hosted</span>
            <span className="text-yellow-400 font-mono">0× · free</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ label, minutes, multiplier, color, bgColor }: {
  platform: string;
  label: string;
  minutes: number;
  multiplier: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={cn("p-2.5 rounded-lg border text-center", bgColor)}>
      <div className={cn("text-xs font-medium mb-1", color)}>{label}</div>
      <div className="text-lg font-bold text-white font-mono">
        {minutes > 0 ? `${minutes.toFixed(1)}m` : "0m"}
      </div>
      <div className={cn("text-[9px] mt-0.5", color)}>
        ×{multiplier} multiplier
      </div>
    </div>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
