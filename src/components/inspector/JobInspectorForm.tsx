"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2, Server, Layers, Database, Key, Shield, Clock, Globe, AlertTriangle, Zap, Settings } from "lucide-react";
import type { JobNodeData, WorkflowPermissions } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface JobInspectorFormProps {
  jobData: JobNodeData;
  nodeId: string;
  onUpdate: (patch: Partial<JobNodeData>) => void;
}

const RUNNER_OPTIONS = [
  { value: "ubuntu-latest", label: "ubuntu-latest", color: "bg-emerald-500/20 text-emerald-300", cost: "1x", os: "Linux" },
  { value: "ubuntu-24.04", label: "ubuntu-24.04", color: "bg-emerald-500/20 text-emerald-300", cost: "1x", os: "Linux" },
  { value: "ubuntu-22.04", label: "ubuntu-22.04", color: "bg-emerald-500/20 text-emerald-300", cost: "1x", os: "Linux" },
  { value: "windows-latest", label: "windows-latest", color: "bg-lime-500/20 text-lime-300", cost: "2x", os: "Windows" },
  { value: "macos-latest", label: "macos-latest", color: "bg-amber-500/20 text-amber-300", cost: "10x", os: "macOS" },
  { value: "macos-14", label: "macos-14", color: "bg-amber-500/20 text-amber-300", cost: "10x", os: "macOS" },
  { value: "self-hosted", label: "self-hosted", color: "bg-yellow-500/20 text-yellow-300", cost: "0x", os: "Custom" },
];

const PERMISSION_SCOPES: Array<{ key: keyof WorkflowPermissions; label: string }> = [
  { key: "actions", label: "Actions" },
  { key: "checks", label: "Checks" },
  { key: "contents", label: "Contents" },
  { key: "deployments", label: "Deployments" },
  { key: "idToken", label: "ID Token" },
  { key: "issues", label: "Issues" },
  { key: "packages", label: "Packages" },
  { key: "pullRequests", label: "Pull Requests" },
  { key: "securityEvents", label: "Security Events" },
];

export default function JobInspectorForm({ jobData, onUpdate }: JobInspectorFormProps) {
  const [activeTab, setActiveTab] = useState<"general" | "matrix" | "services" | "env" | "permissions" | "outputs" | "advanced">("general");

  const updateRunner = useCallback(
    (runner: string) => {
      onUpdate({ runsOn: runner });
    },
    [onUpdate],
  );

  const updateIfCondition = useCallback(
    (ifCond: string) => {
      onUpdate({ ifCondition: ifCond || undefined });
    },
    [onUpdate],
  );

  const updateEnv = useCallback(
    (env: Record<string, string>) => {
      onUpdate({ env: { ...jobData.env, ...env } });
    },
    [jobData.env, onUpdate],
  );

  const updatePermissions = useCallback(
    (perms: WorkflowPermissions | "read-all" | "write-all") => {
      onUpdate({ permissions: perms });
    },
    [onUpdate],
  );

  const addMatrixAxis = useCallback(() => {
    const key = prompt("Axis name (e.g. os, node-version)") ?? "";
    if (!key) return;
    const vals = prompt("Comma-separated values (e.g. ubuntu-latest, macos-latest)") ?? "";
    if (!vals) return;
    const values = vals.split(",").map((v) => v.trim()).filter(Boolean);
    onUpdate({
      strategy: {
        ...jobData.strategy!,
        matrix: {
          ...jobData.strategy!.matrix,
          axes: [...jobData.strategy!.matrix.axes, { key, values }],
        },
      },
    });
  }, [jobData.strategy, onUpdate]);

  const removeMatrixAxis = useCallback(
    (idx: number) => {
      onUpdate({
        strategy: {
          ...jobData.strategy!,
          matrix: {
            ...jobData.strategy!.matrix,
            axes: jobData.strategy!.matrix.axes.filter((_, i) => i !== idx),
          },
        },
      });
    },
    [jobData.strategy, onUpdate],
  );

  const addService = useCallback(() => {
    const image = prompt("Service image (e.g. postgres:15-alpine)") ?? "";
    if (!image) return;
    const serviceId = prompt("Service name (e.g. postgres)") ?? "service";
    onUpdate({
      services: [
        ...jobData.services,
        { serviceId, image, env: {}, ports: [], options: undefined },
      ],
    });
  }, [jobData.services, onUpdate]);

  const removeService = useCallback(
    (idx: number) => {
      onUpdate({
        services: jobData.services.filter((_, i) => i !== idx),
      });
    },
    [jobData.services, onUpdate],
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0F0A] rounded-lg p-0.5 overflow-x-auto">
        {([
          { key: "general", label: "General" },
          { key: "matrix", label: "Matrix" },
          { key: "services", label: "Services" },
          { key: "env", label: "Env" },
          { key: "permissions", label: "Permissions" },
          { key: "outputs", label: "Outputs" },
          { key: "advanced", label: "Advanced" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all",
              activeTab === tab.key
                ? "bg-lime-500/20 text-lime-300 shadow-sm"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === "general" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Job ID */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">
              Job ID <span className="text-red-400">*</span> (technical, used in needs:/outputs:)
            </label>
            <input
              type="text"
              value={jobData.jobId}
              onChange={(e) => onUpdate({ jobId: e.target.value })}
              className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
              placeholder="build-and-test"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              ^[a-zA-Z_][a-zA-Z0-9_-]*$ — used to reference this job via needs.job-id
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">
              Display name
            </label>
            <input
              type="text"
              value={jobData.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
              placeholder="Build & Test"
            />
          </div>

          {/* Runner selection */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Runner (runs-on)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {RUNNER_OPTIONS.map((runner) => (
                <button
                  key={runner.value}
                  onClick={() => updateRunner(runner.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all",
                    jobData.runsOn === runner.value || (Array.isArray(jobData.runsOn) && jobData.runsOn.includes(runner.value))
                      ? "bg-lime-500/15 border-lime-500/30 text-white"
                      : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
                  )}
                >
                  <Server className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 text-left font-mono text-[11px]">{runner.label}</span>
                  <span className={cn("text-[9px] px-1 py-0.5 rounded", runner.color)}>
                    {runner.cost}
                  </span>
                </button>
              ))}
            </div>
            {Array.isArray(jobData.runsOn) && jobData.runsOn.length > 1 && (
              <p className="text-[10px] text-amber-400 mt-1">
                Multiple runners selected — the job runs on each
              </p>
            )}
          </div>

          {/* If condition */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">
              Condition <span className="text-amber-400">if:</span> (optional)
            </label>
            <input
              type="text"
              value={jobData.ifCondition ?? ""}
              onChange={(e) => updateIfCondition(e.target.value)}
              className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
              placeholder="github.ref == 'refs/heads/main'"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Ex: github.event_name == 'pull_request' && github.base_ref == 'main'
            </p>
          </div>

          {/* Environment */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">
              Protected environment (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={jobData.environment?.name ?? ""}
                onChange={(e) => onUpdate({ environment: { name: e.target.value, url: jobData.environment?.url } })}
                className="flex-1 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="production"
              />
              <input
                type="text"
                value={jobData.environment?.url ?? ""}
                onChange={(e) => onUpdate({ environment: { name: jobData.environment?.name ?? "", url: e.target.value || undefined } })}
                className="flex-1 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
                placeholder="https://my-app.vercel.app"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Requires a protection rule in Settings → Environments
            </p>
          </div>

          {/* Timeout */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">
              Timeout (minutes)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={360}
                value={jobData.timeoutMinutes ?? 360}
                onChange={(e) => onUpdate({ timeoutMinutes: Number(e.target.value) || 360 })}
                className="w-24 bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
              />
              <span className="text-[10px] text-gray-500">min (max 360)</span>
            </div>
          </div>

          {/* Continue on error */}
          <div className="flex items-center justify-between p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs text-gray-200 font-medium">Continue on error</div>
                <div className="text-[10px] text-gray-500">Ignore failures (does not mark the job as failed)</div>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ continueOnError: !jobData.continueOnError })}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                jobData.continueOnError ? "bg-lime-500" : "bg-[#2A3022]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                  jobData.continueOnError ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        </motion.div>
      )}

      {/* Matrix */}
      {activeTab === "matrix" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2 p-2.5 bg-lime-500/5 border border-lime-500/20 rounded-lg text-xs text-lime-300">
            <Layers className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              The matrix creates parallel job instances. Each value combination
              generates an additional billable job.
            </span>
          </div>

          {jobData.strategy?.matrix.axes.map((axis, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-lime-300">{axis.key}</span>
                <button
                  onClick={() => removeMatrixAxis(idx)}
                  className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {axis.values.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 bg-[#1D2117] border border-[#2A3022] rounded text-[10px] font-mono text-gray-300"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {jobData.strategy?.matrix.axes.length === 0 && (
            <div className="text-center py-6">
              <Layers className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-3">No matrix axis defined</p>
              <button
                onClick={addMatrixAxis}
                className="px-4 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Add axis
              </button>
            </div>
          )}

          {/* Include / Exclude */}
          <div className="pt-2 border-t border-[#2A3022]">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-400 font-medium">Specific combinations</span>
            </div>

            <div className="flex gap-2 text-[10px]">
              <button
                onClick={() => {
                  const include = prompt("include: JSON object (e.g. { os: 'macos-latest', node-version: '20' })") ?? "";
                  if (include) {
                    try {
                      const parsed = JSON.parse(include);
                      onUpdate({
                        strategy: {
                          ...jobData.strategy!,
                          matrix: {
                            ...jobData.strategy!.matrix,
                            include: [...jobData.strategy!.matrix.include, parsed],
                          },
                        },
                      });
                    } catch {}
                  }
                }}
                className="px-2 py-1 bg-[#1D2117] border border-[#2A3022] rounded text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
              >
                + include
              </button>
              <button
                onClick={() => {
                  const exclude = prompt("exclude: JSON object (e.g. { os: 'macos-latest', node-version: '22' })") ?? "";
                  if (exclude) {
                    try {
                      const parsed = JSON.parse(exclude);
                      onUpdate({
                        strategy: {
                          ...jobData.strategy!,
                          matrix: {
                            ...jobData.strategy!.matrix,
                            exclude: [...jobData.strategy!.matrix.exclude, parsed],
                          },
                        },
                      });
                    } catch {}
                  }
                }}
                className="px-2 py-1 text-gray-400 transition-colors"
              >
                + exclude
              </button>
            </div>

            {jobData.strategy?.matrix.include.length > 0 && (
              <div className="mt-2 text-[10px] text-gray-500">
                Include ({jobData.strategy.matrix.include.length}):
                {jobData.strategy.matrix.include.map((item, i) => (
                  <span key={i} className="font-mono bg-[#1D2117] px-1 rounded">
                    {JSON.stringify(item)}
                  </span>
                ))}
              </div>
            )}

            {jobData.strategy?.matrix.exclude.length > 0 && (
              <div className="mt-1 text-[10px] text-gray-500">
                Exclude ({jobData.strategy.matrix.exclude.length}):
                {jobData.strategy.matrix.exclude.map((item, i) => (
                  <span key={i} className="font-mono text-red-400 bg-[#1D2117] px-1 rounded">
                    {JSON.stringify(item)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Fail fast / max parallel */}
          <div className="flex items-center justify-between p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs text-gray-200 font-medium">Fail fast</div>
                <div className="text-[10px] text-gray-500">Stops instances on failure</div>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ strategy: { ...jobData.strategy!, failFast: !jobData.strategy!.failFast } })}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                jobData.strategy!.failFast ? "bg-lime-500" : "bg-[#2A3022]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                  jobData.strategy!.failFast ? "left-[18px]" : "left-0.5",
                )}
              />
            </button>
          </div>

          {jobData.strategy!.maxParallel !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Max parallel:</span>
              <input
                type="number"
                min={1}
                value={jobData.strategy!.maxParallel}
                onChange={(e) => onUpdate({ strategy: { ...jobData.strategy!, maxParallel: Number(e.target.value) } })}
                className="w-20 bg-[#0D0F0A] border border-[#2A3022] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-lime-500/50"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Services */}
      {activeTab === "services" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-xs text-gray-400">
            Add service containers (PostgreSQL, Redis, etc.) reachable from the job.
          </p>

          <button
            onClick={addService}
            className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add service
          </button>

          {jobData.services.map((service, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono text-gray-300">{service.serviceId}</span>
                </div>
                <button
                  onClick={() => removeService(idx)}
                  className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-gray-500 block mb-0.5">Image</label>
                  <input
                    type="text"
                    value={service.image}
                    onChange={(e) => {
                      const newServices = [...jobData.services];
                      const current = newServices[idx];
                      if (current) newServices[idx] = { ...current, image: e.target.value };
                      onUpdate({ services: newServices });
                    }}
                    className="w-full bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1 font-mono text-gray-200 focus:outline-none focus:border-lime-500/50"
                  />
                </div>

                <div>
                  <label className="text-gray-500 block mb-0.5">Ports</label>
                  <input
                    type="text"
                    value={service.ports?.join(", ") ?? ""}
                    onChange={(e) => {
                      const newServices = [...jobData.services];
                      const current = newServices[idx];
                      if (current)
                        newServices[idx] = {
                          ...current,
                          ports: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        };
                      onUpdate({ services: newServices });
                    }}
                    className="w-full bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1 font-mono text-gray-200 focus:outline-none focus:border-lime-500/50"
                    placeholder="5432:5432"
                  />
                </div>

                <div>
                  <label className="text-gray-500 block mb-0.5">Options</label>
                  <input
                    type="text"
                    value={service.options ?? ""}
                    onChange={(e) => {
                      const newServices = [...jobData.services];
                      const current = newServices[idx];
                      if (current) newServices[idx] = { ...current, options: e.target.value || undefined };
                      onUpdate({ services: newServices });
                    }}
                    className="w-full bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1 font-mono text-gray-200 focus:outline-none focus:border-lime-500/50"
                    placeholder="--name postgres"
                  />
                </div>
              </div>
            </div>
          ))}

          {jobData.services.length === 0 && (
            <div className="text-center py-6">
              <Database className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No services added</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Env */}
      {activeTab === "env" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs text-gray-400">
            Environment variables available to every step in this job.
          </p>

          {Object.entries(jobData.env).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 p-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg"
            >
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  const newEnv = { ...jobData.env };
                  delete newEnv[key];
                  newEnv[e.target.value] = value;
                  updateEnv(newEnv);
                }}
                className="w-24 bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1.5 text-xs font-mono text-lime-300 focus:outline-none focus:border-lime-500/50"
              />
              <span className="text-gray-500">=</span>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newEnv = { ...jobData.env };
                  newEnv[key] = e.target.value;
                  updateEnv(newEnv);
                }}
                className="flex-1 bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-lime-500/50"
              />
              <button
                onClick={() => {
                  const newEnv = { ...jobData.env };
                  delete newEnv[key];
                  updateEnv(newEnv);
                }}
                className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {Object.keys(jobData.env).length === 0 && (
            <div className="text-center py-6">
              <Globe className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No environment variables</p>
            </div>
          )}

          <button
            onClick={() => {
              const key = prompt("Key") ?? "";
              const value = prompt("Value (or ${{ secrets.MY_SECRET }})") ?? "";
              if (key && value !== undefined) {
                updateEnv({ [key]: value });
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors w-full justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
            Add variable
          </button>
        </motion.div>
      )}

      {/* Permissions */}
      {activeTab === "permissions" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs">
            <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-gray-300">
              Permissions for <span className="font-mono text-amber-400">GITHUB_TOKEN</span> on this job.
              Limiting them reduces the attack surface if compromised.
            </div>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              onClick={() => updatePermissions({ contents: "read" })}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-mono border transition-colors",
                !jobData.permissions || (typeof jobData.permissions === "object" && Object.keys(jobData.permissions).length === 0)
                  ? "bg-lime-500/15 border-lime-500/30 text-lime-300"
                  : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
              )}
            >
              contents: read
            </button>
            <button
              onClick={() => updatePermissions("read-all")}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-mono border transition-colors",
                jobData.permissions === "read-all"
                  ? "bg-lime-500/15 border-lime-500/30 text-lime-300"
                  : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
              )}
            >
              read-all
            </button>
            <button
              onClick={() => updatePermissions("write-all")}
              className={cn(
                "px-2 py-1.5 rounded text-[10px] font-mono border transition-colors",
                jobData.permissions === "write-all"
                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                  : "bg-[#0D0F0A] border-[#2A3022] text-gray-400 hover:border-gray-600",
              )}
            >
              write-all
            </button>
          </div>

          {/* Individual scopes */}
          <div className="space-y-1">
            {PERMISSION_SCOPES.map((scope) => {
              const permissionsObject =
                typeof jobData.permissions === "object" && jobData.permissions !== null
                  ? jobData.permissions
                  : {};
              const current = permissionsObject[scope.key];
              return (
                <div key={scope.key} className="flex items-center justify-between p-1.5">
                  <span className="text-xs text-gray-400">{scope.label}</span>
                  <div className="flex gap-0.5">
                    {(["read", "write", "none"] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          const basePermissions =
                            typeof jobData.permissions === "object" && jobData.permissions !== null
                              ? jobData.permissions
                              : {};
                          const newPerms = { ...basePermissions } as Record<string, string>;
                          if (typeof jobData.permissions === "string") {
                            // Upgrade from string to object
                            const base: WorkflowPermissions = { contents: "read" };
                            (base as any)[scope.key] = val;
                            updatePermissions(base);
                            return;
                          }
                          (newPerms as any)[scope.key] = val;
                          updatePermissions(newPerms as WorkflowPermissions);
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-mono transition-colors",
                          current === val
                            ? val === "read"
                              ? "bg-lime-500/15 text-lime-300 border border-lime-500/20"
                              : val === "write"
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : "bg-gray-500/15 text-gray-400 border border-gray-500/20"
                            : "bg-[#1D2117] text-gray-500 border border-transparent hover:border-gray-600",
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Outputs */}
      {activeTab === "outputs" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs text-gray-400">
            Define outputs available to downstream jobs via{" "}
            <span className="font-mono text-lime-400">needs.{jobData.jobId}.outputs.*</span>
          </p>

          {Object.entries(jobData.outputs).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 p-2 bg-[#0D0F0A] border border-[#2A3022] rounded-lg"
            >
              <span className="text-xs text-lime-300 font-mono w-24 flex-shrink-0">{key}</span>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const newOutputs = { ...jobData.outputs };
                  newOutputs[key] = e.target.value;
                  onUpdate({ outputs: newOutputs });
                }}
                className="flex-1 bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-lime-500/50"
                placeholder="\${{ steps.step-id.outputs.version }}"
              />
              <button
                onClick={() => {
                  const newOutputs = { ...jobData.outputs };
                  delete newOutputs[key];
                  onUpdate({ outputs: newOutputs });
                }}
                className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {Object.keys(jobData.outputs).length === 0 && (
            <div className="text-center py-6">
              <Key className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No outputs defined</p>
            </div>
          )}

          <button
            onClick={() => {
              const key = prompt("Output name") ?? "";
              const value = prompt("Value (e.g. \${{ steps.step-id.outputs.version }})") ?? "";
              if (key && value) {
                onUpdate({ outputs: { ...jobData.outputs, [key]: value } });
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors w-full justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
            Add output
          </button>
        </motion.div>
      )}

      {/* Advanced */}
      {activeTab === "advanced" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Container */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Conteneur principal (container)
            </label>
            <input
              type="text"
              value={jobData.container?.image ?? ""}
              onChange={(e) => onUpdate({ container: { image: e.target.value, credentials: undefined, env: undefined, ports: undefined, volumes: undefined, options: undefined } })}
              className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
              placeholder="node:20-alpine"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Docker image used as the job's main execution environment
            </p>
          </div>

          {/* Step count */}
          <div className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-gray-300">Statistics</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500">Number of steps</div>
                <div className="text-gray-200 font-mono text-sm">{jobData.steps.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Actions</div>
                <div className="text-gray-200 font-mono text-sm">
                  {jobData.steps.filter((s) => s.type === "action").length}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Scripts</div>
                <div className="text-gray-200 font-mono text-sm">
                  {jobData.steps.filter((s) => s.type === "run").length}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Disabled</div>
                <div className="text-gray-200 font-mono text-sm">
                  {jobData.steps.filter((s) => s.disabled).length}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
