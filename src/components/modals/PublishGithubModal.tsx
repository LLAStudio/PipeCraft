"use client";

import React, { useState } from "react";
import {
  X,
  GitCommit,
  GitPullRequest,
  Eye,
  Diff,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PublishGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  yamlContent: string;
  projectName: string;
  filePath: string;
  commitMessage: string;
  mode: "direct_commit" | "pull_request";
  prTitle: string;
  prBody: string;
  isPublishing: boolean;
  onModeChange: (mode: "direct_commit" | "pull_request") => void;
  onCommitMessageChange: (msg: string) => void;
  onPrTitleChange: (title: string) => void;
  onPrBodyChange: (body: string) => void;
  onPublish: () => void;
}

export default function PublishGithubModal({
  isOpen,
  onClose,
  yamlContent,
  projectName,
  filePath,
  commitMessage,
  mode,
  prTitle,
  prBody,
  isPublishing,
  onModeChange,
  onCommitMessageChange,
  onPrTitleChange,
  onPrBodyChange,
  onPublish,
}: PublishGithubModalProps) {
  const [showDiff, setShowDiff] = useState(false);

  const isValid =
    commitMessage.trim().length > 0 &&
    (mode === "direct_commit" ||
      (mode === "pull_request" && prTitle.trim().length > 0));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="publish-modal"
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
          className="relative w-full max-w-2xl bg-[#131610] border border-[#2A3022] rounded-xl shadow-lg shadow-black/40 overflow-hidden max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3022] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-lime-500/15 flex items-center justify-center">
                <GitCommit className="w-4 h-4 text-lime-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Publish to GitHub
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {filePath} · {projectName}
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
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Mode selection */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-2 block">
                Publish mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onModeChange("direct_commit")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border text-xs transition-all",
                    mode === "direct_commit"
                      ? "border-lime-500/50 bg-lime-500/10"
                      : "border-[#2A3022] bg-[#0D0F0A] hover:border-[#48513B]",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      mode === "direct_commit"
                        ? "bg-lime-500/20 text-lime-400"
                        : "bg-[#1D2117] text-gray-400",
                    )}
                  >
                    <GitCommit className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "font-medium",
                    mode === "direct_commit" ? "text-lime-300" : "text-gray-300",
                  )}>
                    Commit direct
                  </span>
                  <span className="text-[10px] text-gray-500 text-center">
                    Updates the branch directly
                  </span>
                </button>

                <button
                  onClick={() => onModeChange("pull_request")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border text-xs transition-all",
                    mode === "pull_request"
                      ? "border-lime-500/50 bg-lime-500/10"
                      : "border-[#2A3022] bg-[#0D0F0A] hover:border-[#48513B]",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      mode === "pull_request"
                        ? "bg-lime-500/20 text-lime-400"
                        : "bg-[#1D2117] text-gray-400",
                    )}
                  >
                    <GitPullRequest className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "font-medium",
                    mode === "pull_request" ? "text-lime-300" : "text-gray-300",
                  )}>
                    Pull Request
                  </span>
                  <span className="text-[10px] text-gray-500 text-center">
                    Creates a PR for review
                  </span>
                </button>
              </div>
            </div>

            {/* Commit message */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                Message de commit *
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
                placeholder="Update CI/CD pipeline via PipeCraft"
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors font-mono"
              />
            </div>

            {/* PR details (shown when PR mode) */}
            {mode === "pull_request" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-lime-500/5 border border-lime-500/20 rounded-lg">
                  <GitPullRequest className="w-4 h-4 text-lime-400 flex-shrink-0" />
                  <div className="text-xs text-lime-300">
                    A new branch <span className="font-mono text-white">pipecraft/update-{projectName.toLowerCase().slice(0, 20)}</span> will be created and a PR opened.
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                    PR title *
                  </label>
                  <input
                    type="text"
                    value={prTitle}
                    onChange={(e) => onPrTitleChange(e.target.value)}
                    placeholder="[CI/CD] Update pipeline via PipeCraft"
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">
                    PR description
                  </label>
                  <textarea
                    value={prBody}
                    onChange={(e) => onPrBodyChange(e.target.value)}
                    rows={4}
                    placeholder="## Summary\n\nAutomated CI/CD pipeline update generated by PipeCraft...\n\n## Changes\n\n- ..."
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors font-mono resize-none"
                  />
                </div>
              </div>
            )}

            {/* Diff preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  YAML file preview ({yamlContent.split("\n").length} lines)
                </label>
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors",
                    showDiff
                      ? "bg-lime-500/15 text-lime-300"
                      : "text-gray-500 hover:text-gray-300 hover:bg-[#2A3022]",
                  )}
                >
                  <Diff className="w-3 h-3" />
                  {showDiff ? "Hide" : "Show"}
                </button>
              </div>

              {showDiff && (
                <div className="bg-[#0D0F0A] border border-[#2A3022] rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D2117] border-b border-[#2A3022]">
                    <span className="text-[10px] text-gray-500 font-mono">YAML</span>
                    <span className="text-[9px] text-gray-500">·</span>
                    <span className="text-[9px] text-gray-500">indent: 2</span>
                  </div>
                  <pre className="p-3 text-xs text-gray-300 font-mono leading-relaxed overflow-auto max-h-64 whitespace-pre-wrap">
                    {yamlContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Security check */}
            <div>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-emerald-300 font-medium">
                    Validation YAML
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    The YAML is valid and ready to publish
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-[#2A3022] bg-[#0D0F0A]/50 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <AlertTriangle className="w-3 h-3" />
              <span>
                {mode === "direct_commit"
                  ? "This will overwrite the remote file directly"
                  : "A PR will be created on a new branch"}
            </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2A3022] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onPublish}
                disabled={!isValid || isPublishing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                  !isValid || isPublishing
                    ? "bg-lime-500/20 text-lime-400/50 cursor-not-allowed"
                    : "bg-lime-400 text-[#0E1207] hover:bg-lime-300",
                )}
              >
                {isPublishing ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    {mode === "direct_commit" ? "Publish to GitHub" : "Create PR"}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
