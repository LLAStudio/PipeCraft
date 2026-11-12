"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, GitCommit, GitPullRequest, Clock, Cpu, Play, Settings, Zap, AlertTriangle } from "lucide-react";
import type { TriggerNodeData, TriggerEvent } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TriggerInspectorFormProps {
  triggerData: TriggerNodeData;
  nodeId: string;
  onUpdate: (patch: Partial<TriggerNodeData>) => void;
}

const EVENT_OPTIONS: Array<{ value: TriggerEvent; label: string; icon: React.ReactNode; description: string }> = [
  { value: "push", label: "push", icon: <GitCommit className="w-3.5 h-3.5" />, description: "On push to the configured branches" },
  { value: "pull_request", label: "pull_request", icon: <GitPullRequest className="w-3.5 h-3.5" />, description: "When a PR is opened or updated" },
  { value: "pull_request_target", label: "pull_request_target", icon: <GitPullRequest className="w-3.5 h-3.5" />, description: "Like a PR but with access to secrets (dangerous)" },
  { value: "release", label: "release", icon: <Play className="w-3.5 h-3.5" />, description: "When a release is published" },
  { value: "schedule", label: "schedule", icon: <Clock className="w-3.5 h-3.5" />, description: "On a cron schedule" },
  { value: "workflow_dispatch", label: "workflow_dispatch", icon: <Cpu className="w-3.5 h-3.5" />, description: "Manual dispatch from the GitHub UI" },
  { value: "workflow_call", label: "workflow_call", icon: <Settings className="w-3.5 h-3.5" />, description: "Reusable call from another workflow" },
  { value: "issues", label: "issues", icon: <Play className="w-3.5 h-3.5" />, description: "On issue creation/update" },
  { value: "repository_dispatch", label: "repository_dispatch", icon: <Cpu className="w-3.5 h-3.5" />, description: "Triggered via custom API" },
];

export default function TriggerInspectorForm({ triggerData, nodeId: _nodeId, onUpdate }: TriggerInspectorFormProps) {
  const [activeSection, setActiveSection] = useState<"events" | "push" | "pr" | "schedule" | "dispatch" | "call">("events");

  const toggleEvent = useCallback(
    (event: TriggerEvent) => {
      const newEvents = triggerData.events.includes(event)
        ? triggerData.events.filter((e) => e !== event)
        : [...triggerData.events, event];
      onUpdate({ events: newEvents });
    },
    [triggerData.events, onUpdate],
  );

  const updatePushConfig = useCallback(
    (patch: Partial<TriggerNodeData["pushConfig"]>) => {
      onUpdate({
        pushConfig: { ...triggerData.pushConfig, ...patch },
      });
    },
    [triggerData.pushConfig, onUpdate],
  );

  const updatePRConfig = useCallback(
    (patch: Partial<TriggerNodeData["pullRequestConfig"]>) => {
      onUpdate({
        pullRequestConfig: { ...triggerData.pullRequestConfig, ...patch },
      });
    },
    [triggerData.pullRequestConfig, onUpdate],
  );

  const addSchedule = useCallback(() => {
    const newCron = prompt("Enter the cron expression (e.g. '0 2 * * 1')") ?? "";
    if (!newCron) return;
    const human = cronToHuman(newCron);
    onUpdate({
      scheduleConfig: [...triggerData.scheduleConfig, { cron: newCron, humanDescription: human }],
    });
  }, [triggerData.scheduleConfig, onUpdate]);

  const removeSchedule = useCallback(
    (index: number) => {
      const newSchedules = triggerData.scheduleConfig.filter((_, i) => i !== index);
      onUpdate({ scheduleConfig: newSchedules });
    },
    [triggerData.scheduleConfig, onUpdate],
  );

  const addDispatchInput = useCallback(() => {
    const name = prompt("Parameter name (e.g. environment)") ?? "";
    if (!name) return;
    onUpdate({
      workflowDispatchInputs: [
        ...triggerData.workflowDispatchInputs,
        {
          name,
          description: prompt("Description") ?? "",
          required: false,
          type: "string",
        },
      ],
    });
  }, [triggerData.workflowDispatchInputs, onUpdate]);

  const removeDispatchInput = useCallback(
    (index: number) => {
      const newInputs = triggerData.workflowDispatchInputs.filter((_, i) => i !== index);
      onUpdate({ workflowDispatchInputs: newInputs });
    },
    [triggerData.workflowDispatchInputs, onUpdate],
  );

  // Events section
  const eventSections = useMemo(() => {
    const sections: Array<{ key: string; label: string; items: typeof EVENT_OPTIONS }> = [
      { key: "core", label: "Main events", items: EVENT_OPTIONS.filter((e) => ["push", "pull_request", "pull_request_target", "release"].includes(e.value)) },
      { key: "advanced", label: "Advanced events", items: EVENT_OPTIONS.filter((e) => ["schedule", "workflow_dispatch", "workflow_call", "issues", "repository_dispatch"].includes(e.value)) },
    ];
    return sections;
  }, []);

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 bg-[#0D0F0A] rounded-lg p-0.5">
        {[
          { key: "events", label: "Events" },
          { key: "push", label: "Push" },
          { key: "pr", label: "Pull Request" },
          { key: "schedule", label: "Cron" },
          { key: "dispatch", label: "Manual" },
          { key: "call", label: "Call" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as any)}
            className={cn(
              "flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-medium transition-all",
              activeSection === tab.key
                ? "bg-lime-500/20 text-lime-300"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events */}
      {activeSection === "events" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs text-gray-400 mb-2">
            Select the GitHub events that will trigger this workflow:
          </p>

          {eventSections.map((section) => (
            <div key={section.key} className="mb-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
                {section.label}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {section.items.map((event) => {
                  const isEnabled = triggerData.events.includes(event.value);
                  return (
                    <button
                      key={event.value}
                      onClick={() => toggleEvent(event.value)}
                      className={cn(
                        "flex items-start gap-2 p-2.5 rounded-lg text-left transition-all",
                        isEnabled
                          ? "bg-lime-500/10 border border-lime-500/25"
                          : "bg-[#0D0F0A] border border-[#2A3022] hover:border-[#48513B]",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                          isEnabled ? "bg-lime-400 text-[#0E1207]" : "bg-[#1D2117] text-gray-500",
                        )}
                      >
                        {isEnabled && <Zap className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {event.icon}
                          <span
                            className={cn(
                              "text-xs font-mono",
                              isEnabled ? "text-white font-medium" : "text-gray-400",
                            )}
                          >
                            {event.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {triggerData.events.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>No event selected — the workflow will never run.</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Push config */}
      {activeSection === "push" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs text-gray-400">
            Configure branches, tags and paths for the event{" "}
            <span className="text-lime-400 font-mono">push</span>.
          </p>

          <BranchEditor
            label="Included branches"
            values={triggerData.pushConfig.branches}
            onChange={(vals) => updatePushConfig({ branches: vals })}
            placeholder="main, develop"
          />

          <BranchEditor
            label="Excluded branches"
            values={triggerData.pushConfig.branchesIgnore}
            onChange={(vals) => updatePushConfig({ branchesIgnore: vals })}
            placeholder="ci/*"
          />

          <BranchEditor
            label="Included tags"
            values={triggerData.pushConfig.tags}
            onChange={(vals) => updatePushConfig({ tags: vals })}
            placeholder="v*, release/*"
          />

          <BranchEditor
            label="Excluded tags"
            values={triggerData.pushConfig.tagsIgnore}
            onChange={(vals) => updatePushConfig({ tagsIgnore: vals })}
            placeholder="v0.*"
          />

          <PathEditor
            label="Included paths (paths)"
            values={triggerData.pushConfig.paths}
            onChange={(vals) => updatePushConfig({ paths: vals })}
            placeholder="src/**, package.json"
            help="Only commits touching these files will trigger the workflow"
          />

          <PathEditor
            label="Excluded paths (paths-ignore)"
            values={triggerData.pushConfig.pathsIgnore}
            onChange={(vals) => updatePushConfig({ pathsIgnore: vals })}
            placeholder="**/*.md"
          />
        </motion.div>
      )}

      {/* PR config */}
      {activeSection === "pr" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs text-gray-400">
            Configure branches and event types for{" "}
            <span className="text-lime-400 font-mono">pull_request</span>.
          </p>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">PR event types:</span>
            {["opened", "synchronize", "reopened", "closed", "labeled", "unlabeled", "ready_for_review"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  const types = triggerData.pullRequestConfig.types.includes(type)
                    ? triggerData.pullRequestConfig.types.filter((t) => t !== type)
                    : [...triggerData.pullRequestConfig.types, type];
                  updatePRConfig({ types });
                }}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                  triggerData.pullRequestConfig.types.includes(type)
                    ? "bg-lime-500/15 text-lime-300 border border-lime-500/20"
                    : "bg-[#1D2117] text-gray-500 border border-[#2A3022] hover:border-gray-600",
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <BranchEditor
            label="Target branches"
            values={triggerData.pullRequestConfig.branches}
            onChange={(vals) => updatePRConfig({ branches: vals })}
            placeholder="main, develop"
          />

          <PathEditor
            label="Paths"
            values={triggerData.pullRequestConfig.paths}
            onChange={(vals) => updatePRConfig({ paths: vals })}
            placeholder="src/**, docs/**"
          />
        </motion.div>
      )}

      {/* Schedule */}
      {activeSection === "schedule" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs text-gray-400">
            Schedule automatic runs with cron expressions.
          </p>

          <button
            onClick={addSchedule}
            className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add schedule
          </button>

          {triggerData.scheduleConfig.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-4">
              No schedule added
            </div>
          )}

          {triggerData.scheduleConfig.map((schedule, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg"
            >
              <Clock className="w-4 h-4 text-lime-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white font-medium">
                  {schedule.cron}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {schedule.humanDescription}
                </div>
              </div>
              <button
                onClick={() => removeSchedule(idx)}
                className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Cron helper */}
          <div className="p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs text-gray-400">
            <div className="font-medium text-gray-300 mb-1">Cron cheat sheet:</div>
            <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
              <div className="text-gray-300">Min</div>
              <div className="text-gray-300">Hour</div>
              <div className="text-gray-300">Day</div>
              <div className="text-gray-300">Month</div>
              <div className="text-gray-300">Weekday</div>
            </div>
            <div className="mt-1 text-[10px] text-gray-500">
              Ex: <span className="text-lime-400">0 2 * * 1</span> = Every Monday at 2:00 AM
            </div>
          </div>
        </motion.div>
      )}

      {/* Workflow dispatch */}
      {activeSection === "dispatch" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2 p-2.5 bg-lime-500/5 border border-lime-500/20 rounded-lg text-xs text-lime-300">
            <Cpu className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Enable <span className="font-mono">workflow_dispatch</span> to allow
              manual dispatch from the GitHub Actions UI or the API.
            </span>
          </div>

          {!triggerData.events.includes("workflow_dispatch") ? (
            <button
              onClick={() => toggleEvent("workflow_dispatch")}
              className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              Enable workflow_dispatch
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">
                  Inputs
                </span>
                <button
                  onClick={addDispatchInput}
                  className="flex items-center gap-1 text-[10px] text-lime-400 hover:text-lime-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {triggerData.workflowDispatchInputs.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-3">
                  No inputs defined
                </div>
              ) : (
                <div className="space-y-2">
                  {triggerData.workflowDispatchInputs.map((input, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-lime-300">
                            {input.name}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] px-1 py-0.5 rounded",
                              input.required
                                ? "bg-red-500/15 text-red-400"
                                : "bg-green-500/15 text-green-400",
                            )}
                          >
                            {input.required ? "req" : "opt"}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {input.type}
                          </span>
                        </div>
                        {input.description && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {input.description}
                          </div>
                        )}
                        {input.type === "choice" && input.options && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Options: {input.options.join(", ")}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeDispatchInput(idx)}
                        className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Workflow call */}
      {activeSection === "call" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2 p-2.5 bg-lime-500/5 border border-lime-500/20 rounded-lg text-xs text-lime-300">
            <Settings className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Enable <span className="font-mono">workflow_call</span> to make this
              workflow reusable by other workflows.
            </span>
          </div>

          {!triggerData.events.includes("workflow_call") ? (
            <button
              onClick={() => toggleEvent("workflow_call")}
              className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              Enable workflow_call
            </button>
          ) : (
            <div>
              {Object.keys(triggerData.workflowCallConfig.inputs).length === 0 &&
               Object.keys(triggerData.workflowCallConfig.secrets).length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-3">
                  This reusable workflow expects no inputs or secrets.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">Inputs:</div>
                  {Object.entries(triggerData.workflowCallConfig.inputs).map(([name, cfg]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="text-lime-300 font-mono">{name}</span>
                      <span className="text-gray-500">({cfg.type})</span>
                      {cfg.required && (
                        <span className="text-red-400 text-[9px]">required</span>
                      )}
                      {cfg.description && (
                        <span className="text-gray-500 truncate flex-1">
                          {cfg.description}
                        </span>
                      )}
                    </div>
                  ))}

                  <div className="text-xs text-gray-400 mt-2">Secrets:</div>
                  {Object.entries(triggerData.workflowCallConfig.secrets).map(([name, cfg]) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-1.5 text-xs"
                    >
                      <span className="text-lime-300 font-mono">{name}</span>
                      {cfg.required && (
                        <span className="text-red-400 text-[9px]">required</span>
                      )}
                      {cfg.description && (
                        <span className="text-gray-500 truncate flex-1">
                          {cfg.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-editors: BranchEditor, PathEditor
// ---------------------------------------------------------------------------

interface BranchEditorProps {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}

function BranchEditor({ label, values, onChange, placeholder }: BranchEditorProps) {
  const [inputValue, setInputValue] = useState("");

  const addValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue("");
    }
  };

  const removeValue = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  return (
    <div>
      <label className="text-xs text-gray-400 font-medium mb-1 block">
        {label}
      </label>
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
        />
        <button
          onClick={addValue}
          disabled={!inputValue.trim()}
          className="p-1.5 bg-lime-500/10 border border-lime-500/20 rounded-lg text-lime-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lime-300/20 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1D2117] border border-[#2A3022] rounded text-[10px] font-mono text-gray-300"
            >
              {v}
              <button
                onClick={() => removeValue(v)}
                className="hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface PathEditorProps {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  help?: string;
}

function PathEditor({ label, values, onChange, placeholder, help }: PathEditorProps) {
  const [inputValue, setInputValue] = useState("");

  const addValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue("");
    }
  };

  const removeValue = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  return (
    <div>
      <label className="text-xs text-gray-400 font-medium mb-1 block">
        {label}
      </label>
      <div className="flex gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
        />
        <button
          onClick={addValue}
          disabled={!inputValue.trim()}
          className="p-1.5 bg-lime-500/10 border border-lime-500/20 rounded-lg text-lime-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lime-300/20 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {help && (
        <p className="text-[10px] text-gray-500 mt-1">{help}</p>
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#1D2117] border border-[#2A3022] rounded text-[10px] font-mono text-gray-300"
            >
              {v}
              <button
                onClick={() => removeValue(v)}
                className="hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cron helper
// ---------------------------------------------------------------------------

function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return `Cron: ${cron}`;
  const [min, hour, day, month, dow] = parts;
  const desc: string[] = [];
  if (min !== "*") desc.push(`minute ${min}`);
  if (hour !== "*") desc.push(`hour ${hour}`);
  if (day !== "*") desc.push(`day of month ${day}`);
  if (month !== "*") desc.push(`mois ${month}`);
  if (dow !== "*") desc.push(`weekday ${dow}`);
  return `Every ${desc.join(", ")}`;
}
