"use client";

import React, { useCallback, useMemo } from "react";
import { X, Settings, Zap, Wrench, Shield, DollarSign, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore, getSelectedNode } from "@/store/usePipelineStore";
import type {
  GraphNode,
  GraphNodeData,
  JobNodeData,
  ReusableWorkflowNodeData,
  StepItem,
  TriggerNodeData,
  ValidationError,
  WorkflowGlobalSettings,
} from "@/types/pipeline";
import TriggerInspectorForm from "@/components/inspector/TriggerInspectorForm";
import JobInspectorForm from "@/components/inspector/JobInspectorForm";
import StepInspectorForm from "@/components/inspector/StepInspectorForm";
import ReusableWorkflowForm from "@/components/inspector/ReusableWorkflowForm";
import { motion, AnimatePresence } from "framer-motion";
import { calculateFinopsSafe } from "@/lib/compiler/finopsCalculator";
import { lintSecurity } from "@/lib/validation/securityLinter";
import { validateGraphSummary } from "@/lib/validation/graphValidator";

interface PropertyInspectorProps {
  onClose?: () => void;
}

export default function PropertyInspector({ onClose }: PropertyInspectorProps) {
  const store = usePipelineStore();
  const selectedNode = getSelectedNode(store);

  // Global security score + finops
  const { score: securityScore, alerts: securityAlerts } = useMemo(
    () => lintSecurity(store.nodes, store.globalSettings),
    [store.nodes, store.globalSettings],
  );

  const finopsEstimate = useMemo(
    () => calculateFinopsSafe(store.nodes),
    [store.nodes],
  );

  const graphValidation = useMemo(
    () => validateGraphSummary(store.nodes, store.edges),
    [store.nodes, store.edges],
  );

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <div className="flex flex-col h-full bg-[#131610] border-l border-[#2A3022]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A3022]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-lime-400" />
          <span className="text-sm font-medium text-white">Inspector</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-md hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 divide-x divide-[#2A3022] border-b border-[#2A3022]">
        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center py-2.5 px-3 transition-colors hover:bg-[#1D2117] text-center gap-1"
        >
          <div className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-gray-400 font-medium">GitHub cost</span>
          </div>
          <div className="text-sm font-semibold text-white font-mono">
            {finopsEstimate.totalMinutes > 0
              ? `${finopsEstimate.totalMinutes.toFixed(1)} min`
              : "—"}
          </div>
          <div className="text-[9px] text-gray-500 font-mono">
            est. ${finopsEstimate.costInCents.toFixed(2)}
          </div>
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center py-2.5 px-3 transition-colors hover:bg-[#1D2117] text-center gap-1 relative"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-gray-400 font-medium">Security</span>
          </div>
          <div
            className={cn(
              "text-sm font-semibold font-mono",
              securityScore >= 80
                ? "text-emerald-400"
                : securityScore >= 60
                ? "text-amber-400"
                : "text-red-400",
            )}
          >
            {securityScore}/100
          </div>
          {securityAlerts.length > 0 && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center py-2.5 px-3 transition-colors hover:bg-[#1D2117] text-center gap-1"
        >
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-xs text-gray-400 font-medium">Validity</span>
          </div>
          <div
            className={cn(
              "text-sm font-semibold font-mono",
              graphValidation.errorCount === 0
                ? "text-emerald-400"
                : "text-red-400",
            )}
          >
            {graphValidation.isValid ? "OK" : `${graphValidation.errorCount} err`}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <NodeInspectorContent key={selectedNode.id} node={selectedNode} />
          ) : (
            <GlobalSettingsContent
              key="global"
              settings={store.globalSettings}
              finops={finopsEstimate}
              securityScore={securityScore}
              securityAlerts={securityAlerts}
              validationErrors={graphValidation.errors}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node-specific inspector content
// ---------------------------------------------------------------------------

interface NodeInspectorContentProps {
  node: GraphNode;
}

function NodeInspectorContent({ node }: NodeInspectorContentProps) {
  const data = node.data;

  const updateNodeData = React.useCallback((patch: Partial<GraphNodeData>) => {
    const state = usePipelineStore.getState();
    state.setNodes(
      state.nodes.map((candidate) =>
        candidate.id === node.id ? { ...candidate, data: { ...candidate.data, ...patch } } : candidate,
      ),
    );
  }, [node.id]);

  const updateTrigger = React.useCallback(
    (patch: Partial<TriggerNodeData>) => {
      if (!data.trigger) return;
      updateNodeData({ trigger: { ...data.trigger, ...patch } });
    },
    [data.trigger, updateNodeData],
  );

  const updateJob = React.useCallback(
    (patch: Partial<JobNodeData>) => {
      if (!data.job) return;
      updateNodeData({ job: { ...data.job, ...patch } });
    },
    [data.job, updateNodeData],
  );

  const updateStep = React.useCallback(
    (patch: Partial<StepItem>) => {
      if (!data.step) return;
      updateNodeData({ step: { ...data.step, ...patch } });
    },
    [data.step, updateNodeData],
  );

  const updateReusable = React.useCallback(
    (patch: Partial<ReusableWorkflowNodeData>) => {
      if (!data.reusableWorkflow) return;
      updateNodeData({ reusableWorkflow: { ...data.reusableWorkflow, ...patch } });
    },
    [data.reusableWorkflow, updateNodeData],
  );

  return (
    <div className="p-4 space-y-4">
      {/* Node header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-medium text-white">{data.label}</span>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-[#1D2117] px-1.5 py-0.5 rounded">
          {node.type === "trigger"
            ? "TRIGGER"
            : node.type === "job"
            ? "JOB"
            : node.type === "step"
            ? "STEP"
            : "REUSABLE"}
        </span>
      </div>

      {/* Type-specific form */}
      {node.type === "trigger" && data.trigger && (
        <TriggerInspectorForm triggerData={data.trigger} nodeId={node.id} onUpdate={updateTrigger} />
      )}

      {node.type === "job" && data.job && (
        <JobInspectorForm jobData={data.job} nodeId={node.id} onUpdate={updateJob} />
      )}

      {node.type === "step" && data.step && (
        <StepInspectorForm stepData={data.step} nodeId={node.id} onUpdate={updateStep} />
      )}

      {(node.type === "reusableWorkflow" || node.type === "reusable_workflow") &&
        data.reusableWorkflow && (
          <ReusableWorkflowForm
            reusableData={data.reusableWorkflow}
            nodeId={node.id}
            onUpdate={updateReusable}
          />
        )}

      {/* Node ID */}
      <div className="pt-2 border-t border-[#2A3022]">
        <div className="text-[10px] text-gray-500 font-mono">
          Node ID: {node.id}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Global settings content
// ---------------------------------------------------------------------------

interface GlobalSettingsContentProps {
  settings: WorkflowGlobalSettings;
  finops: ReturnType<typeof calculateFinopsSafe>;
  securityScore: number;
  securityAlerts: Array<{
    rule: string;
    severity: string;
    pointsDeducted: number;
    message: string;
  }>;
  validationErrors: ValidationError[];
}

function GlobalSettingsContent({
  settings,
  finops,
  securityScore,
  securityAlerts,
  validationErrors,
}: GlobalSettingsContentProps) {
  const [activeTab, setActiveTab] = React.useState<"general" | "security" | "finops" | "validation">("general");

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-[#0D0F0A] rounded-lg p-0.5">
        {(["general", "security", "finops", "validation"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all",
              activeTab === tab
                ? "bg-lime-500/20 text-lime-300 shadow-sm"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {tab === "general" && <Settings className="w-3.5 h-3.5" />}
            {tab === "security" && <Shield className="w-3.5 h-3.5" />}
            {tab === "finops" && <DollarSign className="w-3.5 h-3.5" />}
            {tab === "validation" && <Wrench className="w-3.5 h-3.5" />}
            <span>{{ general: "General", security: "Security", finops: "Cost", validation: "Validation" }[tab]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "general" && (
          <motion.div
            key="general"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                Workflow name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => {
                  const store = usePipelineStore.getState();
                  store.setGlobalSettings({ ...settings, name: e.target.value });
                }}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="My Pipeline"
              />
            </div>

            {settings.runName && (
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Run name (run-name)
                </label>
                <input
                  type="text"
                  value={settings.runName}
                  onChange={(e) => {
                    const store = usePipelineStore.getState();
                    store.setGlobalSettings({ ...settings, runName: e.target.value });
                  }}
                  className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                />
              </div>
            )}

            {/* Permissions */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                Permissions (GITHUB_TOKEN)
              </label>
              <div className="bg-[#0D0F0A] border border-[#2A3022] rounded-lg p-3 text-xs font-mono text-gray-300">
                {settings.permissions ? (
                  <pre className="whitespace-pre-wrap">
{JSON.stringify(settings.permissions, null, 2)}
                  </pre>
                ) : (
                  <span className="text-amber-400">Not set — security risk</span>
                )}
              </div>
            </div>

            {/* Concurrency */}
            {settings.concurrency && typeof settings.concurrency === "object" && (
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Concurrency
                </label>
                <div className="bg-[#0D0F0A] border border-[#2A3022] rounded-lg p-3 text-xs font-mono text-gray-300 space-y-1">
                  <div>group: {settings.concurrency.group}</div>
                  <div>cancel-in-progress: {String(settings.concurrency.cancelInProgress)}</div>
                </div>
              </div>
            )}

            {/* Global env */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                Global environment variables
              </label>
              <div className="space-y-1">
                {Object.entries(settings.env).length === 0 ? (
                  <div className="text-xs text-gray-500 italic">No variables defined</div>
                ) : (
                  Object.entries(settings.env).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-1.5 text-xs"
                    >
                      <span className="text-lime-400 font-mono flex-shrink-0">{key}</span>
                      <span className="text-gray-400 font-mono truncate">{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">
                Security score: {securityScore}/100
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-mono",
                  securityScore >= 80
                    ? "bg-emerald-500/15 text-emerald-400"
                    : securityScore >= 60
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-red-500/15 text-red-400",
                )}
              >
                {securityScore >= 80 ? "Bon" : securityScore >= 60 ? "Moyen" : "Critique"}
              </span>
            </div>

            {securityAlerts.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No security alerts detected
              </div>
            ) : (
              <div className="space-y-2">
                {securityAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-lg border text-xs",
                      alert.severity === "critical"
                        ? "bg-red-500/5 border-red-500/20 text-red-300"
                        : alert.severity === "warning"
                        ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                        : "bg-lime-500/5 border-lime-500/20 text-lime-300",
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        "w-4 h-4 flex-shrink-0 mt-0.5",
                        alert.severity === "critical"
                          ? "text-red-400"
                          : alert.severity === "warning"
                          ? "text-amber-400"
                          : "text-lime-400",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-gray-500 mb-0.5">
                        {alert.rule}
                      </div>
                      <p className="text-gray-300 leading-relaxed">{alert.message}</p>
                      {alert.pointsDeducted > 0 && (
                        <div className="text-[10px] text-gray-500 mt-1 font-mono">
                          -{alert.pointsDeducted} pts
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "finops" && (
          <motion.div
            key="finops"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="text-sm font-medium text-white">
              GitHub runner estimate
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Estimated GitHub Actions runner billing — not a PipeCraft charge. PipeCraft is free.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0D0F0A] border border-[#2A3022] rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500 mb-1">Billed total</div>
                <div className="text-lg font-semibold text-white font-mono">
                  {finops.totalMinutes > 0 ? `${finops.totalMinutes.toFixed(1)}m` : "—"}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  ≈ ${finops.costInCents.toFixed(2)}
                </div>
              </div>

              <div className="bg-[#0D0F0A] border border-[#2A3022] rounded-lg p-3">
                <div className="text-[10px] text-gray-500 mb-2">By platform</div>
                <div className="space-y-1.5">
                  {finops.linuxMinutes > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Linux</span>
                      <span className="text-gray-200 font-mono">{finops.linuxMinutes.toFixed(1)}m</span>
                    </div>
                  )}
                  {finops.windowsMinutes > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Windows (2x)</span>
                      <span className="text-gray-200 font-mono">{finops.windowsMinutes.toFixed(1)}m</span>
                    </div>
                  )}
                  {finops.macosMinutes > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">macOS (10x)</span>
                      <span className="text-gray-200 font-mono">{finops.macosMinutes.toFixed(1)}m</span>
                    </div>
                  )}
                  {finops.selfHostedMinutes > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Self-hosted (free)</span>
                      <span className="text-gray-200 font-mono">{finops.selfHostedMinutes.toFixed(1)}m</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Matrix breakdown */}
            {finops.matrixBreakdown.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1.5">
                  Per-job breakdown (matrices)
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {finops.matrixBreakdown.map((item) => (
                    <div
                      key={item.jobId}
                      className="flex items-center justify-between bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-1.5 text-xs"
                    >
                      <span className="text-gray-300 truncate flex-1 font-mono">
                        {item.name}
                      </span>
                      <span className="text-gray-500 font-mono flex-shrink-0 ml-2">
                        {item.instances}x {item.estimatedMinutes.toFixed(1)}m
                        <span
                          className={cn(
                            "ml-1 text-[9px]",
                            item.platform === "macos"
                              ? "text-amber-400"
                              : item.platform === "windows"
                              ? "text-lime-400"
                              : item.platform === "self-hosted"
                              ? "text-emerald-400"
                              : "text-gray-400",
                          )}
                        >
                          {item.platform}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "validation" && (
          <motion.div
            key="validation"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="text-sm font-medium text-white">
              Validation errors
            </div>

            {validationErrors.length === 0 ? (
              <div className="text-xs text-emerald-400 text-center py-4">
                Pipeline valid
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validationErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer hover:bg-[#1D2117] transition-colors",
                      err.severity === "error"
                        ? "bg-red-500/5 border-red-500/20 text-red-300"
                        : err.severity === "warning"
                        ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                        : "bg-lime-500/5 border-lime-500/20 text-lime-300",
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-gray-500 mb-0.5">
                        {err.code}
                      </div>
                      <p className="text-gray-300 leading-relaxed">{err.message}</p>
                      {err.nodeId && (
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                          Nœud: {err.nodeId}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
