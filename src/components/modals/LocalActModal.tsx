"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  X,
  Terminal,
  Copy,
  Check,
  Download,
  Code,
  Zap,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { calculateFinopsSafe } from "@/lib/compiler/finopsCalculator";
import { usePipelineStore } from "@/store/usePipelineStore";

interface LocalActModalProps {
  isOpen: boolean;
  onClose: () => void;
  yamlContent: string;
  estimatedMinutes: number;
  onGenerate: () => void;
}

export default function LocalActModal({
  isOpen,
  onClose,
  yamlContent,
  onGenerate,
}: LocalActModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedRunner, setSelectedRunner] = useState("ubuntu-latest");
  const [selectedDir, setSelectedDir] = useState(".");
  const [includeEnvFile, setIncludeEnvFile] = useState(true);
  const [customFlags, setCustomFlags] = useState("");
  const store = usePipelineStore();

  void calculateFinopsSafe(store.nodes);

  // Generate the act command
  const actCommand = useMemo(() => {
    const flags: Array<string> = [
      "-P",
      `${selectedRunner}`,
      "-W",
      selectedDir,
    ];
    if (includeEnvFile) {
      flags.push("----env-file", ".secrets");
    }
    if (customFlags) {
      flags.push(...customFlags.split(" "));
    }
    return `act -P ${selectedRunner} -W ${selectedDir}${includeEnvFile ? " ----env-file .secrets" : ""}${customFlags ? " " + customFlags : ""}`;
  }, [selectedRunner, selectedDir, includeEnvFile, customFlags]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(actCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [actCommand]);

  const handleDownloadSecretsFile = useCallback(() => {
    const secretsContent = `# Secrets for local runs with act\n# Paste your GitHub secrets here (format: KEY=VALUE)\n# Example:\n# DOCKERHUB_USERNAME=my-user\n# DOCKERHUB_TOKEN=my-token\n# GH_TOKEN=ghp_xxx\n`;
    const blob = new Blob([secretsContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".secrets";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="act-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 "
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="relative w-full max-w-2xl bg-[#131610] border border-[#2A3022] rounded-xl shadow-lg shadow-black/40 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3022]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Test locally with act
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Run GitHub Actions workflows locally (nektos/act)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Quick info */}
            <div className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-300 font-medium mb-0.5">About act</div>
                  <p className="text-gray-500 leading-relaxed">
                    <a
                      href="https://github.com/nektos/act"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lime-400 hover:text-lime-300 underline underline-offset-2"
                    >
                      nektos/act
                    </a>{" "}
                    runs your GitHub Actions workflows locally using Docker.
                    Docker actions require Docker with Docker-in-Docker or the flag{" "}
                    <code className="bg-[#1D2117] px-1 rounded text-[10px] font-mono">--container-architecture linux/amd64</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Command builder */}
            <div className="p-4 bg-[#0D0F0A] border border-[#2A3022] rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-400 font-medium">
                  Generated CLI command
                </span>
              </div>

              <div className="relative">
                <div className="bg-[#1D2117] border border-[#2A3022] rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D0F0A] border-b border-[#2A3022]">
                    <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                    <span className="w-2 h-2 rounded-full bg-red-500/80" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
                    <span className="text-[9px] text-gray-500 ml-1 font-mono">bash</span>
                  </div>
                  <pre className="p-3 text-sm text-gray-200 font-mono leading-relaxed overflow-x-auto">
                    <code>{actCommand}</code>
                  </pre>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      copied
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                        : "bg-lime-500/10 text-lime-300 border border-lime-500/20 hover:bg-lime-300/20",
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy command
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadSecretsFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2A3022] transition-colors border border-[#2A3022] hover:border-gray-600"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .secrets
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-[10px] text-gray-500 font-medium mb-1 block">
                    Runner Docker
                  </label>
                  <select
                    value={selectedRunner}
                    onChange={(e) => setSelectedRunner(e.target.value)}
                    className="w-full bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="ubuntu-latest">ubuntu-latest</option>
                    <option value="ubuntu-24.04">ubuntu-24.04</option>
                    <option value="ubuntu-22.04">ubuntu-22.04</option>
                    <option value="macos-latest">macos-latest</option>
                    <option value="self-hosted">self-hosted</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-medium mb-1 block">
                    Working directory
                  </label>
                  <input
                    type="text"
                    value={selectedDir}
                    onChange={(e) => setSelectedDir(e.target.value)}
                    className="w-full bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-emerald-500/50"
                    placeholder="."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEnvFile}
                    onChange={(e) => setIncludeEnvFile(e.target.checked)}
                    className="rounded bg-[#1D2117] border-[#2A3022] text-emerald-500 focus:ring-emerald-500/30"
                  />
                  Utiliser .secrets (env-file)
                </label>
              </div>

              <div className="mt-2">
                <label className="text-[10px] text-gray-500 font-medium mb-1 block">
                  Other act arguments (optional)
                </label>
                <input
                  type="text"
                  value={customFlags}
                  onChange={(e) => setCustomFlags(e.target.value)}
                  placeholder="--privileged --container-architecture linux/amd64"
                  className="w-full bg-[#1D2117] border border-[#2A3022] rounded px-2 py-1.5 text-xs text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* YAML info */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  Workflow file
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {yamlContent.split("\n").length} lines · {yamlContent.length} characters
                </span>
              </div>
              <div className="p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs font-mono text-gray-400 max-h-32 overflow-auto">
                <span className="text-lime-400">$</span> cat .github/workflows/ci.yml | head -20
                <div className="mt-1 text-gray-500">
                  {yamlContent.split("\n").slice(0, 8).map((line, i) => (
                    <div key={i}>{line || " "}</div>
                  ))}
                  {yamlContent.split("\n").length > 8 && (
                    <div className="text-gray-500 mt-0.5">... {yamlContent.split("\n").length - 8} more lines</div>
                  )}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                To test locally:
              </div>
              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex items-center gap-2 p-2 bg-[#1D2117] rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">1</span>
                  <span>Install <a href="https://github.com/nektos/act" target="_blank" className="text-lime-400 hover:text-lime-300 underline">act</a>: <code className="bg-[#0D0F0A] px-1 rounded text-[10px] font-mono">brew install act</code> or <code className="bg-[#0D0F0A] px-1 rounded text-[10px] font-mono">curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash</code></span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#1D2117] rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">2</span>
                  <span>Install Docker and ensure the Linux/AMD64 architecture is available</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#1D2117] rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">3</span>
                  <span>Create a <code className="bg-[#0D0F0A] px-1 rounded text-[10px] font-mono">.secrets</code> with your GitHub secrets</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#1D2117] rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">4</span>
                  <span>Run the command above from the repository root</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-[#2A3022] bg-[#0D0F0A]/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2A3022] transition-colors"
            >
              Close
            </button>
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              Open terminal
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
