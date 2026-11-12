"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Image,
  Link as LinkIcon,
  Share2,
  Filter,
  Eye,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { compressGraphState } from "@/lib/utils";
import { usePipelineStore } from "@/store/usePipelineStore";

interface ShareExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportYaml: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onShareLink: () => void;
  isExporting: boolean;
  isCopying: boolean;
}

export default function ShareExportModal({
  isOpen,
  onClose,
  onExportYaml,
  onExportPng,
  onExportSvg,
  isExporting,
  isCopying,
}: ShareExportModalProps) {
  const store = usePipelineStore();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareSection, setShowShareSection] = useState(false);

  // Generate shareable link
  const handleGenerateLink = useCallback(() => {
    const graph = {
      nodes: store.nodes,
      edges: store.edges,
      viewport: store.viewport,
      globalSettings: store.globalSettings,
    };
    const encoded = compressGraphState(graph);
    const url = new URL(window.location.href);
    url.searchParams.set("share", encoded);
    setShareUrl(url.toString());
    setShowShareSection(true);
  }, [store]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  // Generate YAML
  const yamlContent = useMemo(() => {
    return graphToYaml({
      nodes: store.nodes,
      edges: store.edges,
      globalSettings: store.globalSettings,
      viewport: store.viewport,
    });
  }, [store.nodes, store.edges, store.globalSettings, store.viewport]);

  const handleDownloadYaml = useCallback(() => {
    const blob = new Blob([yamlContent], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = store.filePath.split("/").pop() ?? "workflow.yml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExportYaml();
  }, [yamlContent, store.filePath, onExportYaml]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="share-modal"
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
          className="relative w-full max-w-lg bg-[#131610] border border-[#2A3022] rounded-xl shadow-lg shadow-black/40 overflow-hidden max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3022]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-lime-500/15 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-lime-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Share and export
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Export your pipeline in several formats
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
            {/* Export YAML */}
            <div className="p-4 bg-[#0D0F0A] border border-[#2A3022] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-lime-400" />
                  <span className="text-sm font-medium text-white">Export as YAML</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {yamlContent.split("\n").length} lines
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Download the complete workflow YAML. Works directly with GitHub Actions.
              </p>
              <button
                onClick={handleDownloadYaml}
                disabled={isExporting}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors w-full justify-center",
                  isExporting
                    ? "bg-lime-500/20 text-lime-400/50 cursor-not-allowed"
                    : "bg-lime-400 text-[#0E1207] hover:bg-lime-300",
                )}
              >
                {isExporting ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Exportation...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download .yml
                  </>
                )}
              </button>
            </div>

            {/* Export PNG/SVG */}
            <div className="p-4 bg-[#0D0F0A] border border-[#2A3022] rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Export image</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Capture the canvas as a high-resolution image or a vector SVG file.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onExportPng}
                  disabled={isExporting}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg text-xs font-medium transition-colors border",
                    isExporting
                      ? "border-[#2A3022] text-gray-500 cursor-not-allowed bg-[#0D0F0A]"
                      : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30",
                  )}
                >
                  {isExporting ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                  ) : (
                    <Filter className="w-3.5 h-3.5" />
                  )}
                  High-resolution PNG
                </button>
                <button
                  onClick={onExportSvg}
                  disabled={isExporting}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg text-xs font-medium transition-colors border",
                    isExporting
                      ? "border-[#2A3022] text-gray-500 cursor-not-allowed bg-[#0D0F0A]"
                      : "border-lime-500/20 bg-lime-500/5 text-lime-300 hover:bg-lime-300/10 hover:border-lime-500/30",
                  )}
                >
                  {isExporting ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-lime-500/30 border-t-lime-500 animate-spin" />
                  ) : (
                    <Image className="w-3.5 h-3.5" />
                  )}
                  SVG vector
                </button>
              </div>
            </div>

            {/* Share link */}
            <div className="p-4 bg-[#0D0F0A] border border-[#2A3022] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">Share link</span>
                </div>
                <button
                  onClick={() => setShowShareSection(!showShareSection)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors",
                    showShareSection
                      ? "bg-amber-500/15 text-amber-300"
                      : "text-gray-500 hover:text-gray-300 hover:bg-[#2A3022]",
                  )}
                >
                  <Eye className="w-3 h-3" />
                  {showShareSection ? "Hide" : "Show"}
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                Share your pipeline read-only without an account. The link encodes the whole graph state in the URL.
              </p>

              {showShareSection ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {shareUrl ? (
                      <>
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 bg-[#1D2117] border border-[#2A3022] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono truncate focus:outline-none"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={handleCopyLink}
                          disabled={isCopying}
                          className={cn(
                            "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                            copied
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                              : isCopying
                              ? "bg-lime-500/20 text-lime-400/50 cursor-not-allowed"
                              : "bg-lime-500/10 text-lime-300 border border-lime-500/20 hover:bg-lime-300/20",
                          )}
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleGenerateLink}
                        disabled={isCopying}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors w-full justify-center"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        {isCopying ? "Generating..." : "Generate link"}
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Public read-only link</div>
                      <div className="text-amber-400/70 mt-0.5">
                        Anyone with the link can view your pipeline. Do not share sensitive data.
                      </div>
                    </div>
                  </div>

                  {shareUrl && (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-lime-300 border border-lime-500/20 hover:bg-lime-300/10 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open read-only
                    </a>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGenerateLink}
                  disabled={isCopying}
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors w-full disabled:opacity-50"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  {isCopying ? "Generating link..." : "Generate share link"}
                </button>
              )}
            </div>

            {/* Quick tips */}
            <div className="p-3 bg-[#0D0F0A] border border-[#2A3022] rounded-lg text-xs text-gray-500">
              <div className="font-medium text-gray-400 mb-1">Available formats:</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                  <span className="text-gray-400">.yml full workflow (GitHub Actions)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-gray-400">PNG (2x DPI)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-gray-400">SVG vector</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                  <span className="text-gray-400">LZ-String link (no account)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-[#2A3022] bg-[#0D0F0A]/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2A3022] transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
