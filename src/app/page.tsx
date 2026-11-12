"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  GitBranch,
  Shield,
  DollarSign,
  ArrowRight,
  Play,
  Sparkles,
  Terminal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "@/store/usePipelineStore";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";

const features = [
  {
    icon: <GitBranch className="w-5 h-5" />,
    title: "Visual no-code editor",
    description:
      "Build complex CI/CD pipelines with connected nodes. No YAML to write by hand.",
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Two-way sync",
    description:
      "Every canvas change generates clean YAML. Paste YAML and the graph updates in real time.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Automated DevSecOps audit",
    description:
      "Detects script injection, unpinned actions, excessive permissions and plaintext secrets.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: "Live GitHub runner cost estimate",
    description:
      "Estimate GitHub Actions runner billing (Linux 1x, Windows 2x, macOS 10x), including matrices — this is GitHub cost, not a PipeCraft charge.",
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Built-in AI (Cmd+K)",
    description:
      "Describe what you want in plain language and let AI update your graph.",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: <Terminal className="w-5 h-5" />,
    title: "Local runs (act)",
    description:
      "Generate the nektos/act CLI command to test workflows locally without pushing to GitHub.",
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
  },
];

const stats = [
  { value: "8", label: "Official templates" },
  { value: "100+", label: "GitHub Actions compatibility" },
  { value: "0", label: "YAML to write (optional)" },
  { value: "∞", label: "Undo/Redo" },
];

export default function HomePage() {
  const router = useRouter();
  const store = usePipelineStore();
  const [isLoadingSandbox, setIsLoadingSandbox] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Open sandbox (free, no-auth editor with demo pipeline)
  const handleOpenSandbox = useCallback(async () => {
    setIsLoadingSandbox(true);

    // Reset store to default demo graph
    store.reset();

    // Navigate to editor with a temporary sandbox project ID
    router.push("/editor/sandbox");
  }, [router, store]);

  // Drag and drop YAML import
  const { getRootProps, getInputProps, isDragActive: isFileDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        if (file.name.endsWith(".yml") || file.name.endsWith(".yaml")) {
          const text = await file.text();
          // Would trigger YAML import here
          console.log("YAML import:", file.name, text.length, "bytes");
        }
      }
    },
    accept: { "text/yaml": [".yml", ".yaml"] },
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDragOver: () => setDragActive(true),
  });

  return (
    <div className="min-h-screen bg-[#0B0D08]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#2A3022]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-lime-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 17l6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">
              PipeCraft
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="#features"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/templates"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/projects"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Projects
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="https://github.com/lemonlimeacid/PipeCraft"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12C24 5.37 18.63 0 12 0Z" />
              </svg>
              GitHub
            </Link>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="max-w-5xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#131610] border border-[#2A3022] text-xs text-gray-300 font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
              Visual CI/CD editor — no YAML
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1] [text-wrap:balance]">
              Design your{" "}
              <span className="text-lime-300">
                GitHub Actions
              </span>{" "}
              pipelines without writing YAML
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              PipeCraft is a drag-and-drop visual editor to build, validate and
              deploy CI/CD workflows. Two-way sync, security audit and cost estimates.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleOpenSandbox}
                disabled={isLoadingSandbox}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all",
                  isLoadingSandbox
                    ? "bg-lime-500/20 text-lime-400/60 cursor-not-allowed"
                    : "bg-lime-400 text-[#0E1207] hover:bg-lime-300 active:scale-[0.98]",
                )}
              >
                {isLoadingSandbox ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ouverture...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Open the editor now
                  </>
                )}
                <span className="text-xs text-[#0E1207]/70 ml-1">
                  (no account, free)
                </span>
              </button>

              <Link
                href="/templates"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-[#1D2117] text-gray-200 border border-[#2A3022] hover:bg-[#2A3022] hover:text-white hover:border-gray-600 transition-all active:scale-[0.98]"
              >
                Browse templates
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Drop zone for YAML */}
            <div
              {...getRootProps()}
              className={cn(
                "mt-10 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer",
                dragActive || isFileDragActive
                  ? "border-lime-500/50 bg-lime-500/5"
                  : "border-[#2A3022] bg-[#131610] hover:border-[#48513B] hover:bg-[#181B13]",
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-center">
                {dragActive || isFileDragActive ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-lime-500/20 flex items-center justify-center">
                      <Import className="w-6 h-6 text-lime-400" />
                    </div>
                    <p className="text-sm text-lime-300 font-medium">
                      Drop your YAML file here
                    </p>
                    <p className="text-xs text-lime-400/60">
                      .github/workflows/*.yml — instant import
                    </p>
                  </>
                ) : (
                  <>
                    <Import className="w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-400">
                      or paste / import an existing YAML file
                    </p>
                    <p className="text-xs text-gray-500">
                      Automatic two-way sync
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="p-4 rounded-xl bg-[#131610] border border-[#2A3022] text-center"
              >
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div id="features" className="max-w-6xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Everything you need for your CI/CD pipelines
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From visual design to publishing on GitHub, including
              security validation and cost estimates.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group p-5 rounded-xl bg-[#131610] border border-[#2A3022] hover:border-[#48513B] hover:bg-[#181B13] transition-all"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:scale-110",
                    feature.bgColor,
                  )}
                >
                  <span className={cn("text-lg", feature.color)}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-lime-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Visual demo placeholder */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="relative rounded-xl overflow-hidden bg-[#0D0F0A] border border-[#2A3022]">
            {/* Simulated IDE */}
            <div className="h-[400px] bg-[#0D0F0A] flex">
              {/* Sidebar */}
              <div className="w-48 bg-[#131610] border-r border-[#2A3022] p-3 space-y-2">
                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-2">
                  Blocs
                </div>
                {[
                  { label: "Trigger", color: "#FACC15" },
                  { label: "Job Linux", color: "#A3E635" },
                  { label: "Job macOS", color: "#A3E635" },
                  { label: "Reusable WF", color: "#94A3B8" },
                  { label: "Action Step", color: "#10B981" },
                  { label: "Script Step", color: "#F59E0B" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1D2117] cursor-grab text-xs text-gray-300"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Canvas area */}
              <div className="flex-1 relative bg-[#0D0F0A]">
                {/* Grid dots */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: `radial-gradient(circle, #2A3022 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Simulated nodes */}
                <div className="absolute top-8 left-12">
                  <div className="w-36 p-2.5 rounded-lg bg-[#1E1B0E] border-2 border-yellow-500/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-xs font-semibold text-white">Trigger</span>
                      <span className="text-[9px] text-yellow-300/60 ml-auto font-mono">on:</span>
                    </div>
                    <div className="flex gap-1">
                      {["push", "pr", "dispatch"].map((e) => (
                        <span
                          key={e}
                          className="text-[8px] bg-yellow-500/10 text-yellow-300 px-1 rounded font-mono"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="absolute top-12 left-1/2 -translate-x-1/2">
                  <div className="w-44 p-2.5 rounded-lg bg-[#151A0C]/90 border-2 border-lime-500/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-lime-500" />
                      <span className="text-xs font-semibold text-white">Build & Lint</span>
                      <span className="text-[9px] text-lime-300/60 ml-auto font-mono">job-id</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[8px] font-bold">1</span>
                        <span className="text-emerald-300">actions/checkout@v4</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[8px] font-bold">2</span>
                        <span className="text-emerald-300">actions/setup-node@v4</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[8px] font-bold">3</span>
                        <span className="text-amber-200/80">npm ci</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute top-36 left-1/2 -translate-x-1/2">
                  <div className="w-44 p-2.5 rounded-lg bg-[#151A0C]/90 border-2 border-lime-500/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-lime-500" />
                      <span className="text-xs font-semibold text-white">Test Matrix</span>
                      <span className="text-[9px] text-lime-400 font-mono text-[9px] ml-auto">4x</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[8px] font-bold">1</span>
                        <span className="text-emerald-300">actions/checkout@v4</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[8px] font-bold">2</span>
                        <span className="text-amber-200/80">npm test</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute top-60 left-1/2 -translate-x-1/2">
                  <div className="w-44 p-2.5 rounded-lg bg-[#151A0C]/90 border-2 border-lime-500/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-lime-500" />
                      <span className="text-xs font-semibold text-white">Deploy Docker</span>
                      <span className="text-[9px] text-amber-400/60 ml-auto font-mono">if:main</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[8px] font-bold">1</span>
                        <span className="text-emerald-300">docker/login-action@v3</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[8px] font-bold">2</span>
                        <span className="text-emerald-300">docker/build-push-action@v5</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection lines (simulated) */}
                <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                  <path
                    d="M 100 40 Q 240 30 380 40"
                    stroke="#A3E635"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 2"
                    opacity="0.6"
                  />
                  <path
                    d="M 380 80 Q 520 80 660 80"
                    stroke="#A3E635"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 2"
                    opacity="0.6"
                  />
                </svg>

                {/* Bottom toolbar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#131610] border border-[#2A3022] rounded-xl px-1.5 py-1.5 shadow-xl">
                  {[
                    { icon: <UndoIcon className="w-4 h-4" />, label: "Undo" },
                    { icon: <RedoIcon className="w-4 h-4" />, label: "Redo" },
                    { icon: <ZoomInIcon className="w-4 h-4" />, label: "+" },
                    { icon: <ZoomOutIcon className="w-4 h-4" />, label: "-" },
                    { icon: <MaximizeIcon className="w-4 h-4" />, label: "Fit" },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2A3022] transition-colors"
                    >
                      {btn.icon}
                    </button>
                  ))}
                  <div className="w-1 h-5 bg-[#2A3022] mx-1" />
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-lime-400 bg-lime-500/10 hover:bg-lime-300/20 transition-colors">
                    <LayoutIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* MiniMap */}
                <div className="hidden lg:flex absolute bottom-3 right-3 w-24 h-14 rounded-lg bg-[#131610] border border-[#2A3022] overflow-hidden items-center justify-center pointer-events-none">
                  <div className="text-[9px] text-gray-500 font-mono">MiniMap</div>
                </div>
              </div>

              {/* Right panel */}
              <div className="w-72 bg-[#131610] border-l border-[#2A3022] p-3 space-y-3">
                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  Inspecteur
                </div>
                <div className="p-2.5 rounded-lg bg-[#0D0F0A] border border-[#2A3022]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white">Build & Lint</span>
                    <span className="text-[9px] text-gray-500 font-mono">job-id</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">runs-on</span>
                      <span className="text-gray-300 font-mono">ubuntu-latest</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">timeout</span>
                      <span className="text-gray-300 font-mono">360 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">steps</span>
                      <span className="text-gray-300 font-mono">3</span>
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0D0F0A] border border-[#2A3022]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">GitHub cost</span>
                    <span className="text-xs font-semibold text-emerald-400 font-mono">~2.5 min</span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Linux</span>
                      <span className="text-gray-400 font-mono">2.5m · 1x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. GitHub charge</span>
                      <span className="text-emerald-400 font-mono">~$0.02</span>
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0D0F0A] border border-[#2A3022]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">Security</span>
                    <span className="text-xs font-semibold text-amber-400 font-mono">95/100</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    No critical alerts
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay label */}
            <div className="absolute top-3 left-3 px-2 py-1 rounded text-[9px] font-mono text-gray-500 bg-[#0D0F0A]/80 border border-[#2A3022]">
              LIVE DEMO
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-mono text-gray-500">React Flow v12.3.0</span>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-xl bg-[#131610] border border-[#2A3022]"
          >
            <h2 className="text-xl font-semibold text-white mb-3">
              Ready to visualize your next pipeline?
            </h2>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              Connect your GitHub account to import existing repositories,
              open pull requests and watch runs live.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/signin"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-400 text-[#0E1207] hover:bg-lime-300 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12C24 5.37 18.63 0 12 0Z" />
                </svg>
                Continue with GitHub
              </Link>
              <button
                onClick={handleOpenSandbox}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D2117] text-gray-200 border border-[#2A3022] hover:bg-[#2A3022] hover:text-white text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                Open now (no account)
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2A3022] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-lime-500/20 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-lime-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 17l6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
            </div>
            <span>
              PipeCraft — Visual CI/CD Editor.{" "}
              <a
                href="https://github.com/lemonlimeacid/PipeCraft"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Source code
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2024 PipeCraft</span>
            <a
              href="/templates"
              className="hover:text-gray-300 transition-colors"
            >
              Templates
            </a>
            <a
              href="/projects"
              className="hover:text-gray-300 transition-colors"
            >
              Projects
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons (inline SVGs for demo)
function Import({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}
