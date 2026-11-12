"use client";

import React, { useState, useCallback } from "react";
import {
  X,
  GitBranch,
  FileCode,
  RefreshCw,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RepoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  repos: Array<{ fullName: string; owner: string; name: string; defaultBranch: string; description: string | null }>;
  selectedRepo: string | null;
  selectedBranch: string;
  selectedFile: string | null;
  isLoadingRepos: boolean;
  isLoadingFiles: boolean;
  onSelectRepo: (repo: string) => void;
  onSelectBranch: (branch: string) => void;
  onSelectFile: (file: string) => void;
  onImport: () => void;
  onRefreshRepos: () => void;
  onRefreshFiles: () => void;
}

export default function RepoImportModal({
  isOpen,
  onClose,
  repos,
  selectedRepo,
  selectedBranch,
  selectedFile,
  isLoadingRepos,
  isLoadingFiles,
  onSelectRepo,
  onSelectBranch,
  onSelectFile,
  onImport,
  onRefreshRepos,
  onRefreshFiles,
}: RepoImportModalProps) {
  const [localFileList] = useState<Array<{ path: string; name: string; sha: string }>>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(() => {
    if (!selectedRepo || !selectedFile) return;
    setIsImporting(true);
    onImport();
    setTimeout(() => {
      setIsImporting(false);
      onClose();
    }, 1500);
  }, [selectedRepo, selectedFile, onImport, onClose]);

  const repo = repos.find((r) => r.fullName === selectedRepo);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="import-modal"
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
          className="relative w-full max-w-lg bg-[#131610] border border-[#2A3022] rounded-xl shadow-lg shadow-black/40 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3022]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-lime-500/15 flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-lime-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Import a YAML file
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Choose a GitHub repository and a workflow file
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
          <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Select repository */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-lime-500/15 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-lime-500" />
                  </span>
                  1. Choose a repository
                </label>
                <button
                  onClick={onRefreshRepos}
                  disabled={isLoadingRepos}
                  className="p-1 rounded hover:bg-[#2A3022] text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoadingRepos && "animate-spin")} />
                </button>
              </div>

              {repo ? (
                <button
                  onClick={() => onSelectRepo("")}
                  className="flex items-center gap-3 w-full p-2.5 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-left hover:border-lime-500/30 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-lime-500/10 flex items-center justify-center flex-shrink-0">
                    <GitBranch className="w-4 h-4 text-lime-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white font-mono truncate">
                      {repo.fullName}
                    </div>
                    {repo.description && (
                      <div className="text-[10px] text-gray-500 truncate">
                        {repo.description}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              ) : (
                <div className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg">
                  <div className="text-xs text-gray-500 mb-2 text-center">
                    Sign in with GitHub to see your repositories
                  </div>
                  <button className="w-full py-2 bg-lime-500/10 border border-lime-500/20 rounded-lg text-xs text-lime-300 hover:bg-lime-300/20 transition-colors">
                    Connect GitHub
                  </button>
                </div>
              )}

              {selectedRepo && (
                <div className="mt-2 p-2.5 bg-lime-500/5 border border-lime-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-emerald-300 font-medium">
                        {selectedRepo}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Default branch: {repo?.defaultBranch ?? "main"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select branch */}
            <div>
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-2">
                <span className="w-5 h-5 rounded-full bg-lime-500/15 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-lime-500" />
                </span>
                2. Choose a branch
              </label>

              <select
                value={selectedBranch}
                onChange={(e) => onSelectBranch(e.target.value)}
                className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
              >
                <option value="main">main</option>
                <option value="master">master</option>
                <option value="develop">develop</option>
              </select>
            </div>

            {/* Step 3: Select workflow file */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-lime-500/15 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-lime-500" />
                  </span>
                  3. Choose a workflow file
                </label>
                <button
                  onClick={onRefreshFiles}
                  disabled={isLoadingFiles}
                  className="p-1 rounded hover:bg-[#2A3022] text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoadingFiles && "animate-spin")} />
                </button>
              </div>

              {selectedRepo && selectedBranch ? (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {localFileList.length > 0 ? (
                    localFileList.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => onSelectFile(file.path)}
                        className={cn(
                          "flex items-center gap-2 w-full p-2 rounded-lg text-left transition-colors",
                          selectedFile === file.path
                            ? "bg-lime-500/15 border border-lime-500/30"
                            : "bg-[#0D0F0A] border border-transparent hover:bg-[#1D2117] hover:border-[#2A3022]",
                        )}
                      >
                        <FileCode
                          className={cn(
                            "w-4 h-4 flex-shrink-0",
                            selectedFile === file.path ? "text-lime-400" : "text-amber-400/60",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-gray-200 truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {file.path}
                          </div>
                        </div>
                        {selectedFile === file.path && (
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 bg-[#0D0F0A] border border-dashed border-[#2A3022] rounded-lg text-center">
                      <FileCode className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                      <div className="text-xs text-gray-500">
                        No files found in .github/workflows/
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-[#0D0F0A] border border-dashed border-[#2A3022] rounded-lg text-center">
                  <div className="text-xs text-gray-500">
                    Select a repository to see its files
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-[#2A3022] bg-[#0D0F0A]/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2A3022] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedRepo || !selectedFile || isImporting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                !selectedRepo || !selectedFile || isImporting
                  ? "bg-lime-500/20 text-lime-400/50 cursor-not-allowed"
                  : "bg-lime-400 text-[#0E1207] hover:bg-lime-300",
              )}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Importation...
                </>
              ) : (
                <>
                  <GitBranch className="w-3.5 h-3.5" />
                  Import
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
