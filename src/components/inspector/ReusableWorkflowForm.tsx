"use client";

import React, { useState, useCallback } from "react";
import { RefreshCw, ExternalLink, Plus, Trash2, Lock } from "lucide-react";
import type { ReusableWorkflowNodeData } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ReusableWorkflowFormProps {
  reusableData: ReusableWorkflowNodeData;
  nodeId: string;
  onUpdate: (patch: Partial<ReusableWorkflowNodeData>) => void;
}

const LOCAL_EXAMPLES = [
  "./.github/workflows/deploy.yml",
  "./.github/workflows/ci.yml",
  "./.github/workflows/test.yml",
];

const REMOTE_EXAMPLES = [
  "actions/stale/.github/workflows/stale.yml@v9",
  "github/codeql-action/init/.github/workflows/codeql.yml@v3",
];

export default function ReusableWorkflowForm({ reusableData, onUpdate }: ReusableWorkflowFormProps) {
  const [activeTab, setActiveTab] = useState<"config" | "inputs" | "secrets" | "security">("config");

  const isLocal = reusableData.uses.startsWith("./") || reusableData.uses.startsWith("../");

  const updateUses = useCallback(
    (uses: string) => {
      onUpdate({ uses });
    },
    [onUpdate],
  );

  const updateWith = useCallback(
    (withValues: Record<string, string>) => {
      onUpdate({ with: withValues });
    },
    [onUpdate],
  );

  const updateSecrets = useCallback(
    (secrets: Record<string, string> | "inherit") => {
      onUpdate({ secrets });
    },
    [onUpdate],
  );

  const addWithParam = useCallback(() => {
    const key = prompt("Parameter name") ?? "";
    if (!key) return;
    const value = prompt("Value (may contain ${{ github.sha }}, etc.)") ?? "";
    onUpdate({ with: { ...reusableData.with, [key]: value } });
  }, [reusableData.with, onUpdate]);

  const addSecret = useCallback(() => {
    const key = prompt("Secret name") ?? "";
    if (!key) return;
    onUpdate({
      secrets: typeof reusableData.secrets === "object"
        ? { ...reusableData.secrets as Record<string, string>, [key]: "" }
        : { [key]: "" },
    });
  }, [reusableData.secrets, onUpdate]);

  const removeSecret = useCallback(
    (key: string) => {
      if (typeof reusableData.secrets !== "object") return;
      const newSecrets = { ...(reusableData.secrets as Record<string, string>) };
      delete newSecrets[key];
      onUpdate({ secrets: newSecrets });
    },
    [reusableData.secrets, onUpdate],
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0F0A] rounded-lg p-0.5">
        {[
          { key: "config", label: "Config" },
          { key: "inputs", label: "Inputs" },
          { key: "secrets", label: "Secrets" },
          { key: "security", label: "Security" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-[11px] font-medium transition-all",
              activeTab === tab.key
                ? "bg-lime-500/20 text-lime-300"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="space-y-4"
      >
        {/* ===== CONFIG TAB ===== */}
        {activeTab === "config" && (
          <>
            {/* Uses */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">
                Workflow source (uses)
                <ExternalLink className="inline w-3 h-3 ml-1 text-gray-500" />
              </label>
              <input
                type="text"
                value={reusableData.uses}
                onChange={(e) => updateUses(e.target.value)}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="./.github/workflows/deploy.yml@v1"
              />
              <div className="flex items-center gap-3 mt-1.5">
                {isLocal ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-lime-400 bg-lime-500/10 px-1.5 py-0.5 rounded">
                    <RefreshCw className="w-3 h-3" />
                    Local
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    <ExternalLink className="w-3 h-3" />
                    Distant
                  </span>
                )}

                {reusableData.uses.includes("@") ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                    Pinned: {reusableData.uses.split("@").pop()}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Unpinned
                  </span>
                )}
              </div>
            </div>

            {/* Quick examples */}
            <div>
              <div className="text-[10px] text-gray-500 mb-1">Quick examples:</div>
              <div className="flex flex-wrap gap-1">
                {[...LOCAL_EXAMPLES, ...REMOTE_EXAMPLES].map((example) => (
                  <button
                    key={example}
                    onClick={() => updateUses(example)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono border transition-colors",
                      reusableData.uses === example
                        ? "bg-lime-500/15 border-lime-500/30 text-lime-300"
                        : "bg-[#1D2117] border-[#2A3022] text-gray-400 hover:border-gray-600",
                    )}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">
                Display name
              </label>
              <input
                type="text"
                value={reusableData.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="Production deployment"
              />
            </div>

            {/* If condition */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">
                Condition <span className="text-amber-400">if:</span>
              </label>
              <input
                type="text"
                value={reusableData.ifCondition ?? ""}
                onChange={(e) => onUpdate({ ifCondition: e.target.value || undefined })}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="github.ref == 'refs/heads/main'"
              />
            </div>

            {/* Permissions */}
            <ReusablePermissionsEditor
              permissions={reusableData.permissions}
              onUpdate={(perms) => onUpdate({ permissions: perms })}
            />
          </>
        )}

        {/* ===== INPUTS TAB ===== */}
        {activeTab === "inputs" && (
          <>
            <div className="flex items-start gap-2 p-2.5 bg-lime-500/5 border border-lime-500/20 rounded-lg text-xs text-lime-300">
              <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Parameters <span className="font-mono">with</span> are passed to the reusable workflow.
                They must match the inputs defined in the called workflow.
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Parameters (with)</span>
              <button
                onClick={addWithParam}
                className="flex items-center gap-1 text-[10px] text-lime-400 hover:text-lime-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {Object.entries(reusableData.with).length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
                <RefreshCw className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-500 mb-1">No parameters passed</p>
                <p className="text-[10px] text-gray-500">Parameters are passed via <span className="font-mono">with:</span></p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(reusableData.with).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg group"
                  >
                    <span className="text-xs font-mono text-lime-300 w-24 flex-shrink-0">{key}</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const newWith = { ...reusableData.with };
                        newWith[key] = e.target.value;
                        updateWith(newWith);
                      }}
                      className="flex-1 bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-lime-500/50"
                    />
                    <button
                      onClick={() => {
                        const newWith = { ...reusableData.with };
                        delete newWith[key];
                        updateWith(newWith);
                      }}
                      className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== SECRETS TAB ===== */}
        {activeTab === "secrets" && (
          <>
            <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-300">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Secrets are forwarded to the reusable workflow. Use{" "}
                <span className="font-mono text-amber-400">inherit</span> to inherit secrets from the calling job,
                or define explicit mappings.
              </span>
            </div>

            {/* Inherit toggle */}
            <div className="flex items-center justify-between p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs text-gray-200 font-medium">Inherit secrets</div>
                  <div className="text-[10px] text-gray-500">Inherits secrets from the caller context</div>
                </div>
              </div>
              <button
                onClick={() => updateSecrets(reusableData.secrets === "inherit" ? ({} as Record<string, string>) : "inherit")}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors",
                  reusableData.secrets === "inherit" ? "bg-lime-500" : "bg-[#2A3022]",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                    reusableData.secrets === "inherit" ? "left-[18px]" : "left-0.5",
                  )}
                />
              </button>
            </div>

            {/* Individual secrets */}
            {typeof reusableData.secrets === "object" && reusableData.secrets !== null && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">Explicit secrets</span>
                  <button
                    onClick={addSecret}
                    className="flex items-center gap-1 text-[10px] text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                {Object.keys(reusableData.secrets as Record<string, string>).length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
                    <Lock className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                    <p className="text-gray-500">No explicit secrets</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(reusableData.secrets as Record<string, string>).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 p-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg group"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => {
                            const newSecrets = { ...(reusableData.secrets as Record<string, string>) };
                            const val = newSecrets[key];
                            delete newSecrets[key];
                            newSecrets[e.target.value] = val ?? "";
                            updateSecrets(newSecrets);
                          }}
                          className="w-28 bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500/50"
                        />
                        <span className="text-gray-500">=</span>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => {
                            const newSecrets = { ...(reusableData.secrets as Record<string, string>) };
                            newSecrets[key] = e.target.value;
                            updateSecrets(newSecrets);
                          }}
                          className="flex-1 bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-amber-500/50"
                          placeholder="${{ secrets.MY_SECRET }}"
                        />
                        <button
                          onClick={() => removeSecret(key)}
                          className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
            <div className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs">
              <h3 className="text-gray-300 font-medium mb-2">Security overview</h3>

              <div className="space-y-2">
                {/* SHA pinning */}
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      reusableData.uses.includes("@") && /@[a-f0-9]{40}$/i.test(reusableData.uses)
                        ? "bg-emerald-500/20"
                        : "bg-amber-500/20",
                    )}
                  >
                    {reusableData.uses.includes("@") && /@[a-f0-9]{40}$/i.test(reusableData.uses) ? (
                      <CheckIcon className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ExclamationIcon className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className={cn(
                      "text-xs font-medium",
                      reusableData.uses.includes("@") && /@[a-f0-9]{40}$/i.test(reusableData.uses)
                        ? "text-emerald-300"
                        : "text-amber-300",
                    )}>
                      {reusableData.uses.includes("@") && /@[a-f0-9]{40}$/i.test(reusableData.uses)
                        ? "Pinned workflow (SHA)"
                        : "Unpinned workflow"}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {reusableData.uses.includes("@") && /@[a-f0-9]{40}$/i.test(reusableData.uses)
                        ? "Stable reference via commit SHA"
                        : reusableData.uses.includes("@")
                        ? `Tag/version mutable: ${reusableData.uses.split("@").pop()}`
                        : "No version specified — uses the default branch"}
                    </div>
                  </div>
                </div>

                {/* Secrets mode */}
                <div className="flex items-start gap-2 pt-1">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      reusableData.secrets === "inherit"
                        ? "bg-lime-500/20"
                        : typeof reusableData.secrets === "object" && Object.keys(reusableData.secrets as Record<string, string>).length > 0
                        ? "bg-emerald-500/20"
                        : "bg-amber-500/20",
                    )}
                  >
                    {reusableData.secrets === "inherit" ? (
                      <RefreshCw className="w-3 h-3 text-lime-400" />
                    ) : typeof reusableData.secrets === "object" && Object.keys(reusableData.secrets as Record<string, string>).length > 0 ? (
                      <CheckIcon className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ExclamationIcon className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className={cn(
                      "text-xs font-medium",
                      reusableData.secrets === "inherit"
                        ? "text-lime-300"
                        : typeof reusableData.secrets === "object" && Object.keys(reusableData.secrets as Record<string, string>).length > 0
                        ? "text-emerald-300"
                        : "text-amber-300",
                    )}>
                      {reusableData.secrets === "inherit"
                        ? "Inherited secrets"
                        : typeof reusableData.secrets === "object" && Object.keys(reusableData.secrets as Record<string, string>).length > 0
                        ? `Explicit secrets (${Object.keys(reusableData.secrets as Record<string, string>).length})`
                        : "No secrets configured"}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {reusableData.secrets === "inherit"
                        ? "Inherited from the caller context"
                        : typeof reusableData.secrets === "object"
                        ? "Mappings explicites configured"
                        : "Define explicit secrets or inherit"}
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                {reusableData.permissions && typeof reusableData.permissions !== "string" && (
                  <div className="flex items-start gap-2 pt-1">
                    <div className="w-4 h-4 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldSmall className="w-3 h-3 text-lime-400" />
                    </div>
                    <div>
                      <div className="text-xs text-lime-300 font-medium">Limited permissions</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Scopes: {Object.entries(reusableData.permissions as Record<string, string>)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ReusablePermissionsEditorProps {
  permissions: ReusableWorkflowNodeData["permissions"];
  onUpdate: (perms: ReusableWorkflowNodeData["permissions"]) => void;
}

function ReusablePermissionsEditor({ permissions, onUpdate }: ReusablePermissionsEditorProps) {
  const scopes: Array<{ key: string; label: string }> = [
    { key: "contents", label: "Contents" },
    { key: "packages", label: "Packages" },
    { key: "deployments", label: "Deployments" },
    { key: "issues", label: "Issues" },
    { key: "pullRequests", label: "PRs" },
    { key: "securityEvents", label: "Security" },
  ];

  return (
    <div>
      <label className="text-xs text-gray-400 font-medium mb-1.5 block">
        Permissions
      </label>
      <div className="grid grid-cols-3 gap-1 mb-2">
        <button
          onClick={() => onUpdate({ contents: "read" })}
          className={cn(
            "px-2 py-1 rounded text-[10px] font-mono border transition-colors",
            (typeof permissions === "object" && permissions !== null && permissions.contents === "read" && Object.keys(permissions).length === 1)
              ? "bg-lime-500/15 border-lime-500/30 text-lime-300"
              : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
          )}
        >
          {typeof permissions === "object" && permissions !== null && permissions.contents === "read" ? "Enabled" : "contents: read"}
        </button>
        <button
          onClick={() => onUpdate("read-all")}
          className={cn(
            "px-2 py-1 rounded text-[10px] font-mono border transition-colors",
            permissions === "read-all"
              ? "bg-lime-500/15 border-lime-500/30 text-lime-300"
              : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
          )}
        >
          read-all
        </button>
        <button
          onClick={() => onUpdate("write-all")}
          className={cn(
            "px-2 py-1 rounded text-[10px] font-mono border transition-colors",
            permissions === "write-all"
              ? "bg-red-500/15 border-red-500/30 text-red-400"
              : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
          )}
        >
          write-all
        </button>
      </div>

      {typeof permissions === "object" && permissions !== null && (
        <div className="space-y-1">
          {scopes.map((scope) => {
            const val = (permissions as any)[scope.key];
            return (
              <div key={scope.key} className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{scope.label}</span>
                <div className="flex gap-0.5">
                  {(["read", "write", "none"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        const newPerms = { ...(permissions as object) };
                        (newPerms as any)[scope.key] = v;
                        onUpdate(newPerms as ReusableWorkflowNodeData["permissions"]);
                      }}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors",
                        val === v
                          ? "bg-lime-500/15 text-lime-300 border border-lime-500/20"
                          : "bg-[#1D2117] text-gray-500 border border-transparent hover:border-gray-600",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ShieldSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
