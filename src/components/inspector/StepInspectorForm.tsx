"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Trash2,
  GitBranch,
  Terminal,
  Clock,
  ChevronDown,
  AlertTriangle,
  Search,
  Zap,
  Check,
  Settings,
} from "lucide-react";
import type { StepItem, ActionMetadata } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StepInspectorFormProps {
  stepData: StepItem;
  nodeId: string;
  onUpdate: (patch: Partial<StepItem>) => void;
  onDelete?: () => void;
}

const SHELL_OPTIONS = ["bash", "sh", "pwsh", "python", "cmd"] as const;

const MARKETPLACE_SUGGESTIONS = [
  { uses: "actions/checkout@v4", name: "Checkout", description: "Checkout a Git repository" },
  { uses: "actions/setup-node@v4", name: "Setup Node.js", description: "Set up Node.js with npm cache" },
  { uses: "actions/setup-python@v5", name: "Setup Python", description: "Set up Python with pip cache" },
  { uses: "actions/cache@v4", name: "Cache", description: "Dependency cache" },
  { uses: "actions/upload-artifact@v4", name: "Upload Artifact", description: "Upload artifacts" },
  { uses: "actions/download-artifact@v4", name: "Download Artifact", description: "Download artifacts" },
  { uses: "actions/stale@v9", name: "Stale", description: "Mark issues/PRs as stale" },
  { uses: "docker/setup-buildx-action@v3", name: "Docker Buildx", description: "Configure Docker Buildx" },
  { uses: "docker/build-push-action@v5", name: "Docker Build & Push", description: "Build and push an image" },
  { uses: "docker/login-action@v3", name: "Docker Login", description: "Log in to a registry" },
  { uses: "github/codeql-action/init@v3", name: "CodeQL Init", description: "Initialise CodeQL SAST" },
  { uses: "github/codeql-action/analyze@v3", name: "CodeQL Analyze", description: "Run CodeQL analysis" },
  { uses: "vercel/action/cli@v1", name: "Vercel Deploy", description: "Deploy to Vercel" },
  { uses: "cloudflare/wrangler-action@v3", name: "Cloudflare Wrangler", description: "Run Wrangler CLI" },
];

export default function StepInspectorForm({ stepData, onUpdate, onDelete }: StepInspectorFormProps) {
  const [activeTab, setActiveTab] = useState<"config" | "inputs" | "security">("config");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingMarketplace, setIsSearchingMarketplace] = useState(false);

  const isAction = stepData.type === "action";
  const isRun = stepData.type === "run";

  // Determine if this step has a uses
  const stepUses = stepData.uses;
  const matchingSuggestion = useMemo(() => {
    if (!stepUses) return null;
    return MARKETPLACE_SUGGESTIONS.find((s) => s.uses === stepUses);
  }, [stepUses]);

  const typeSwitching = useCallback(
    (newType: "action" | "run") => {
      if (newType === "action" && isRun) {
        // Switch from run to action: keep name, set uses to a common default
        onUpdate({ type: "action", uses: "actions/checkout@v4", run: undefined });
      } else if (newType === "run" && isAction) {
        // Switch from action to run: keep name, set run to a placeholder
        onUpdate({ type: "run", run: "# Write your shell script here\n" });
      }
    },
    [isAction, isRun, onUpdate],
  );

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2 p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
        <button
          onClick={() => typeSwitching("action")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all border",
            isAction
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-[#1D2117] border-[#2A3022] text-gray-500 hover:border-gray-600",
          )}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Action (uses:)
        </button>
        <button
          onClick={() => typeSwitching("run")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all border",
            isRun
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : "bg-[#1D2117] border-[#2A3022] text-gray-500 hover:border-gray-600",
          )}
        >
          <Terminal className="w-3.5 h-3.5" />
          Script (run:)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0F0A] rounded-lg p-0.5">
        {(["config", "inputs", "security"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-medium transition-all",
              activeTab === tab
                ? "bg-lime-500/20 text-lime-300"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {tab === "config" && <Cog className="w-3.5 h-3.5" />}
            {tab === "inputs" && <Settings className="w-3.5 h-3.5" />}
            {tab === "security" && <ShieldIcon className="w-3.5 h-3.5" />}
            <span className="capitalize">{tab}</span>
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="space-y-3"
      >
        {/* ===== CONFIG TAB ===== */}
        {activeTab === "config" && (
          <>
            {/* Name */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">
                Step name (name)
              </label>
              <input
                type="text"
                value={stepData.name ?? ""}
                onChange={(e) => onUpdate({ name: e.target.value || undefined })}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="Install dependencies"
              />
              {!stepData.name && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Optional — if empty, GitHub uses the action name or "Run script"
                </p>
              )}
            </div>

            {/* Step ID */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">
                Identifiant technique (id)
              </label>
              <input
                type="text"
                value={stepData.stepId ?? ""}
                onChange={(e) => onUpdate({ stepId: e.target.value || undefined })}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="install-deps"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Used to reference outputs: steps.[id].outputs.*
              </p>
            </div>

            {/* If condition */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">
                Condition <span className="text-amber-400">if:</span> (optional)
              </label>
              <input
                type="text"
                value={stepData.ifCondition ?? ""}
                onChange={(e) => onUpdate({ ifCondition: e.target.value || undefined })}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="!cancelled() && github.ref == 'refs/heads/main'"
              />
            </div>

            {/* ===== ACTION MODE ===== */}
            {isAction && (
              <>
                {/* Action search / select */}
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">
                    Action (uses)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={stepData.uses ?? ""}
                      onChange={(e) => onUpdate({ uses: e.target.value || undefined })}
                      onFocus={() => setIsSearchingMarketplace(true)}
                      onBlur={() => setTimeout(() => setIsSearchingMarketplace(false), 200)}
                      className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg pl-8 pr-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                      placeholder="actions/checkout@v4"
                    />
                    {isSearchingMarketplace && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1D2117] border border-[#2A3022] rounded-lg shadow-xl shadow-black/40 z-50 max-h-48 overflow-y-auto">
                        {searchQuery && (
                          <div className="p-1.5">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50"
                              placeholder="Search actions..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setIsSearchingMarketplace(false);
                                  (e.target as HTMLElement).closest("[data-marketplace-dropdown]")?.remove();
                                }
                              }}
                              data-marketplace-dropdown
                            />
                          </div>
                        )}
                        <div className="py-1">
                          {MARKETPLACE_SUGGESTIONS
                            .filter(
                              (s) =>
                                !searchQuery ||
                                s.uses.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                s.name.toLowerCase().includes(searchQuery.toLowerCase()),
                            )
                            .slice(0, 8)
                            .map((suggestion) => (
                              <button
                                key={suggestion.uses}
                                onClick={() => {
                                  onUpdate({ uses: suggestion.uses, name: suggestion.name });
                                  setSearchQuery("");
                                  setIsSearchingMarketplace(false);
                                }}
                                className={cn(
                                  "flex items-center gap-2 w-full px-3 py-2 text-left transition-colors",
                                  stepData.uses === suggestion.uses
                                    ? "bg-lime-500/15 text-lime-300"
                                    : "hover:bg-[#2A3022] text-gray-300",
                                )}
                              >
                                <GitBranch className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium">{suggestion.name}</div>
                                  <div className="text-[10px] text-gray-500 truncate">
                                    {suggestion.uses}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    {suggestion.description}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {matchingSuggestion && (
                    <div className="mt-1.5 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400 mb-0.5">
                        <GitBranch className="w-3 h-3" />
                        <span className="font-medium">{matchingSuggestion.name}</span>
                      </div>
                      <p className="text-gray-500">{matchingSuggestion.description}</p>
                    </div>
                  )}
                </div>

                {/* With parameters */}
                {stepData.actionMetadata && (
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                      Parameters (with)
                    </label>
                    <WithEditor
                      with={stepData.with ?? {}}
                      metadata={stepData.actionMetadata}
                      onChange={(withValues) => onUpdate({ with: withValues })}
                    />
                  </div>
                )}

                {/* Working directory */}
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">
                    Working directory (working-directory)
                  </label>
                  <input
                    type="text"
                    value={stepData.workingDirectory ?? ""}
                    onChange={(e) => onUpdate({ workingDirectory: e.target.value || undefined })}
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                    placeholder="./subdir"
                  />
                </div>
              </>
            )}

            {/* ===== RUN MODE ===== */}
            {isRun && (
              <>
                {/* Script editor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400 font-medium">
                      Shell script (run)
                    </label>
                    {stepData.shell && (
                      <span className="text-[10px] text-gray-500 font-mono bg-[#1D2117] px-1.5 py-0.5 rounded">
                        {stepData.shell}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={stepData.run ?? ""}
                    onChange={(e) => onUpdate({ run: e.target.value })}
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono leading-relaxed placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors min-h-[120px] resize-y"
                    placeholder="#!/bin/bash&#10;echo 'Hello World'&#10;npm test"
                  />
                </div>

                {/* Shell selection */}
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                    Shell
                  </label>
                  <div className="flex gap-1.5">
                    {SHELL_OPTIONS.map((shell) => (
                      <button
                        key={shell}
                        onClick={() => onUpdate({ shell })}
                        className={cn(
                          "flex-1 py-1.5 px-2 rounded-md text-xs font-mono border transition-colors",
                          stepData.shell === shell
                            ? "bg-lime-500/15 border-lime-500/30 text-lime-300"
                            : "bg-[#0D0F0A] border-[#2A3022] text-gray-500 hover:border-gray-600",
                        )}
                      >
                        {shell}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Working directory */}
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">
                    Working directory (working-directory)
                  </label>
                  <input
                    type="text"
                    value={stepData.workingDirectory ?? ""}
                    onChange={(e) => onUpdate({ workingDirectory: e.target.value || undefined })}
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                    placeholder="./subdir"
                  />
                </div>
              </>
            )}

            {/* Common fields */}
            <div className="pt-2 border-t border-[#2A3022]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400">Timeout</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={stepData.timeoutMinutes ?? 360}
                  onChange={(e) => onUpdate({ timeoutMinutes: Number(e.target.value) || 360 })}
                  className="w-20 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-2 py-1.5 text-xs text-gray-200 font-mono text-right focus:outline-none focus:border-lime-500/50"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2A3022] mt-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-gray-400">Continue on error</span>
                </div>
                <button
                  onClick={() => onUpdate({ continueOnError: !stepData.continueOnError })}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    stepData.continueOnError ? "bg-lime-500" : "bg-[#2A3022]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                      stepData.continueOnError ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2A3022] mt-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400">Step disabled</span>
                </div>
                <button
                  onClick={() => onUpdate({ disabled: !stepData.disabled })}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    stepData.disabled ? "bg-gray-500" : "bg-[#2A3022]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                      stepData.disabled ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== INPUTS TAB ===== */}
        {activeTab === "inputs" && (
          <>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                Environment variables (env)
              </label>
              <EnvEditor
                env={stepData.env ?? {}}
                onChange={(env) => onUpdate({ env: env ?? undefined })}
              />
            </div>

            {isAction && stepData.with && Object.keys(stepData.with).length > 0 && (
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                  Parameters (with)
                </label>
                <WithEditor
                  with={stepData.with}
                  metadata={stepData.actionMetadata}
                  onChange={(withValues) => onUpdate({ with: withValues })}
                />
              </div>
            )}
          </>
        )}

        {/* ===== SECURITY TAB ===== */}
        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs text-gray-400">
              <p className="text-gray-300 font-medium mb-1">Security overview</p>
              <SecurityChecklist
                step={stepData}
                onFix={(fix) => fix()}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Delete button */}
      {onDelete && (
        <div className="pt-3 border-t border-[#2A3022]">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 w-full px-3 py-2 bg-red-500/5 border border-red-500/15 rounded-lg text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/25 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete this step
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-editors
// ---------------------------------------------------------------------------

interface WithEditorProps {
  with: Record<string, string>;
  metadata?: ActionMetadata | undefined;
  onChange: (withValues: Record<string, string>) => void;
}

function WithEditor({ with: withValues, metadata, onChange }: WithEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditingValue(withValues[key] ?? "");
  };

  const commitEdit = () => {
    if (editingKey) {
      const newWith = { ...withValues };
      newWith[editingKey] = editingValue;
      onChange(newWith);
    }
    setEditingKey(null);
  };

  return (
    <div className="space-y-1.5 max-h-52 overflow-y-auto">
      {Object.entries(metadata?.inputs ?? {}).map(([key, info]) => {
        const currentValue = withValues[key] ?? info.default ?? "";
        return (
          <div
            key={key}
            className="flex items-center gap-2 p-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-lime-300">{key}</span>
                {info.required && (
                  <span className="text-[9px] text-red-400">required</span>
                )}
                {info.type && (
                  <span className="text-[9px] text-gray-500">({info.type})</span>
                )}
              </div>
              {info.description && (
                <div className="text-[10px] text-gray-500 mt-0.5">{info.description}</div>
              )}
            </div>

            {editingKey === key ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingKey(null);
                  }}
                  className="w-32 bg-[#1D2117] border border-lime-500/50 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none"
                  autoFocus
                />
                <button onClick={commitEdit} className="p-1 text-emerald-400 hover:text-emerald-300">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingKey(null)} className="p-1 text-gray-500 hover:text-gray-300">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-mono text-gray-300 bg-[#1D2117] px-2 py-0.5 rounded border border-[#2A3022] min-w-[80px] truncate">
                  {currentValue}
                </span>
                <button
                  onClick={() => startEdit(key)}
                  className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(withValues).length === 0 && (
        <div className="text-xs text-gray-500 text-center py-3">
          No parameters defined
        </div>
      )}
    </div>
  );
}

interface EnvEditorProps {
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}

function EnvEditor({ env, onChange }: EnvEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const startEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  const commitEdit = () => {
    if (editingKey) {
      const newEnv = { ...env };
      newEnv[editingKey] = editingValue;
      onChange(newEnv);
    }
    setEditingKey(null);
  };

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {Object.entries(env).map(([key, value]) => (
        <div
          key={key}
          className="flex items-center gap-2 p-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-emerald-400">{key}</span>
            </div>
          </div>

          {editingKey === key ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditingKey(null);
                }}
                className="flex-1 min-w-[120px] bg-[#1D2117] border border-lime-500/50 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none"
                autoFocus
              />
              <button onClick={commitEdit} className="p-1 text-emerald-400">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingKey(null)} className="p-1 text-gray-500">
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-mono text-gray-300 bg-[#1D2117] px-2 py-0.5 rounded border border-[#2A3022] min-w-[80px] truncate">
                {value}
              </span>
              <button
                onClick={() => startEdit(key, value)}
                className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const newEnv = { ...env };
                  delete newEnv[key];
                  onChange(newEnv);
                }}
                className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}

      {Object.keys(env).length === 0 && (
        <div className="text-xs text-gray-500 text-center py-3">
          No environment variables
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security checklist
// ---------------------------------------------------------------------------

interface SecurityChecklistProps {
  step: StepItem;
  onFix: (fix: () => void) => void;
}

function SecurityChecklist({ step, onFix }: SecurityChecklistProps) {
  const checks = getSecurityChecks(step);
  const allPassed = checks.every((c) => c.passed);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            allPassed ? "bg-emerald-400" : "bg-amber-400",
          )}
        />
        <span className="text-xs font-medium text-gray-300">
          {allPassed ? "All checks pass" : `${checks.filter((c) => !c.passed).length} issue(s) found`}
        </span>
      </div>

      <div className="space-y-1.5">
        {checks.map((check, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-2 p-2 rounded-lg border text-xs",
              check.passed
                ? "bg-emerald-500/5 border-emerald-500/15"
                : "bg-amber-500/5 border-amber-500/20",
            )}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                check.passed ? "bg-emerald-500/20" : "bg-amber-500/20",
              )}
            >
              {check.passed ? (
                <Check className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                "font-medium text-[11px]",
                check.passed ? "text-emerald-300" : "text-amber-300",
              )}>
                {check.label}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{check.detail}</div>
            </div>
            {!check.passed && check.fix && (
              <button
                onClick={() => check.fix && onFix(check.fix)}
                className="px-2 py-0.5 bg-lime-500/15 border border-lime-500/25 rounded text-[10px] text-lime-300 hover:bg-lime-300/25 transition-colors flex-shrink-0"
              >
                Corriger
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SecurityCheck {
  label: string;
  detail: string;
  passed: boolean;
  fix?: () => void;
}

function getSecurityChecks(step: StepItem): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  // Check 1: action pinning
  if (step.uses) {
    const isPinned = /@[a-f0-9]{40}$/i.test(step.uses);
    checks.push({
      label: "Pinned action (SHA)",
      detail: isPinned
        ? "Action referenced by a commit SHA"
        : `Unpinned action: ${step.uses}. Risk of silent code changes`,
      passed: isPinned,
      fix: () => {
        // Placeholder: real fix would call GitHub API to resolve tag -> SHA
        if (confirm("This opens the GitHub API to resolve the SHA (requires authentication). Continue?")) {
          // would trigger an API call
        }
      },
    });
  }

  // Check 2: script injection (run mode)
  if (step.type === "run" && step.run) {
    const hasUnsafeExpr = /\$\{\{.*(github\.event\.issue\.title|github\.event\.issue\.body|github\.event\.pull_request\.title|github\.event\.pull_request\.body|github\.event\.comment\.body|github\.head_ref).*\}\}/.test(step.run);
    checks.push({
      label: "No script injection",
      detail: hasUnsafeExpr
        ? "User-controlled expressions used directly — injection risk"
        : "No sensitive user expressions detected",
      passed: !hasUnsafeExpr,
      fix: () => {
        alert("Suggested fix: move the expression to env: and use \$VAR in the script. (Full implementation requires manual editing)");
      },
    });
  }

  // Check 3: no hardcoded secrets
  if (step.run) {
    const secretPatterns = [
      /ghp_[A-Za-z0-9]{36}/,
      /sk-[A-Za-z0-9]{20,}/,
      /AKIA[A-Z0-9]{16}/,
    ];
    let foundSecret = false;
    for (const pattern of secretPatterns) {
      if (pattern.test(step.run)) {
        foundSecret = true;
        break;
      }
    }
    checks.push({
      label: "No hardcoded secrets",
      detail: foundSecret
        ? "A potential secret (API token, AWS key, etc.) was detected in the script"
        : "No hardcoded secrets detected",
      passed: !foundSecret,
      fix: () => {
        alert("Suggested fix: replace with \${{ secrets.MY_SECRET }}. (Full implementation requires manual editing)");
      },
    });
  }

  // Check 4: shell injection via set -e / set -o pipefail
  if (step.type === "run" && step.run) {
    checks.push({
      label: "Bonnes pratiques shell",
      detail: step.run.includes("set -e") || step.run.includes("set -o pipefail")
        ? "Scripts use set -e or set -o pipefail to fail fast"
        : "Consider adding 'set -e' or 'set -eo pipefail' to fail fast",
      passed: step.run.includes("set -e") || step.run.includes("set -o pipefail"),
    });
  }

  return checks;
}

// Icons
function Cog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
