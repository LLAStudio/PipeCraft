"use client";

import React, { useState, useCallback } from "react";
import {
  Type,
  GitBranch,
  Layers,
  Database,
  Server,
  Snowflake,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileCode,
  Search,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import type { NodeData, TriggerNodeData, JobNodeData, StepItem, ReusableWorkflowNodeData } from "@/types/pipeline";
import { generateUUID } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NodePaletteSidebarProps {
  onDragBlock?: (blockType: DragBlockType, position: { x: number; y: number }) => void;
  onFileSelected?: (filePath: string) => void;
  githubFiles?: Array<{ path: string; name: string; sha: string; size: number }>;
  isLoadingFiles?: boolean;
  onRefreshFiles?: () => void;
  connectedRepo?: string | null;
  onDisconnectRepo?: () => void;
}

type DragBlockType =
  | "trigger"
  | "job-linux"
  | "job-windows"
  | "job-macos"
  | "job-selfhosted"
  | "reusable-workflow"
  | "step-action"
  | "step-script"
  | "service-postgres"
  | "service-redis"
  | "service-mongodb"
  | "service-memcached";

interface DragBlock {
  type: DragBlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaultData?: () => Partial<NodeData>;
}

const DRAG_BLOCKS: DragBlock[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Events that start the workflow",
    icon: <GitBranch className="w-4 h-4" />,
    color: "#FACC15",
    defaultData: () => ({
      id: "trigger",
      label: "Trigger",
      color: "#FACC15",
      trigger: {
        events: ["push", "pull_request", "workflow_dispatch"],
        pushConfig: { branches: ["main"], branchesIgnore: [], tags: [], tagsIgnore: [], paths: [], pathsIgnore: [] },
        pullRequestConfig: { types: ["opened", "synchronize", "reopened"], branches: ["main"], branchesIgnore: [], paths: [], pathsIgnore: [] },
        scheduleConfig: [],
        workflowDispatchInputs: [{ name: "environment", description: "Target environment", required: true, type: "choice", default: "staging", options: ["staging", "production"] }],
        workflowCallConfig: { inputs: {}, secrets: {}, outputs: {} },
      } as TriggerNodeData,
    }),
  },
  {
    type: "job-linux",
    label: "Job Linux",
    description: "Runner ubuntu-latest",
    icon: <Server className="w-4 h-4" />,
    color: "#A3E635",
    defaultData: () => ({
      id: "job-linux",
      label: "Job Linux",
      color: "#A3E635",
      job: {
        jobId: "job-linux",
        name: "Job Linux",
        runsOn: "ubuntu-latest",
        continueOnError: false,
        env: {},
        outputs: {},
        steps: [],
        timeoutMinutes: 360,
        services: [],
        strategy: { failFast: true, matrix: { axes: [], include: [], exclude: [] } },
      } as unknown as JobNodeData,
    }),
  },
  {
    type: "job-windows",
    label: "Job Windows",
    description: "windows-latest runner (2x cost)",
    icon: <Server className="w-4 h-4" />,
    color: "#A3E635",
    defaultData: () => ({
      id: "job-windows",
      label: "Job Windows",
      color: "#A3E635",
      job: {
        jobId: "job-windows",
        name: "Job Windows",
        runsOn: "windows-latest",
        continueOnError: false,
        env: {},
        outputs: {},
        steps: [],
        timeoutMinutes: 360,
        services: [],
        strategy: { failFast: true, matrix: { axes: [], include: [], exclude: [] } },
      } as unknown as JobNodeData,
    }),
  },
  {
    type: "job-macos",
    label: "Job macOS",
    description: "macos-latest runner (10x cost)",
    icon: <Snowflake className="w-4 h-4" />,
    color: "#A3E635",
    defaultData: () => ({
      id: "job-macos",
      label: "Job macOS",
      color: "#A3E635",
      job: {
        jobId: "job-macos",
        name: "Job macOS",
        runsOn: "macos-latest",
        continueOnError: false,
        env: {},
        outputs: {},
        steps: [],
        timeoutMinutes: 360,
        services: [],
        strategy: { failFast: true, matrix: { axes: [], include: [], exclude: [] } },
      } as unknown as JobNodeData,
    }),
  },
  {
    type: "job-selfhosted",
    label: "Job Self-Hosted",
    description: "Custom runner (free quota)",
    icon: <Server className="w-4 h-4" />,
    color: "#A3E635",
    defaultData: () => ({
      id: "job-selfhosted",
      label: "Job Self-Hosted",
      color: "#A3E635",
      job: {
        jobId: "job-selfhosted",
        name: "Job Self-Hosted",
        runsOn: "self-hosted",
        continueOnError: false,
        env: {},
        outputs: {},
        steps: [],
        timeoutMinutes: 360,
        services: [],
        strategy: { failFast: true, matrix: { axes: [], include: [], exclude: [] } },
      } as unknown as JobNodeData,
    }),
  },
  {
    type: "reusable-workflow",
    label: "Reusable workflow",
    description: "Workflow call ./.github/workflows/...",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "#94A3B8",
    defaultData: () => ({
      id: "reusable-workflow",
      label: "Reusable Workflow",
      color: "#94A3B8",
      reusableWorkflow: {
        jobId: "reusable-workflow",
        name: "Reusable Workflow",
        uses: "./.github/workflows/deploy.yml",
        with: {},
        secrets: {},
      } as ReusableWorkflowNodeData,
    }),
  },
  {
    type: "step-action",
    label: "Action step",
    description: "GitHub Action (uses:)",
    icon: <GitBranch className="w-4 h-4" />,
    color: "#10B981",
    defaultData: () => ({
      id: "step-action",
      label: "Action Step",
      color: "#10B981",
      step: {
        id: generateUUID(),
        stepId: undefined,
        name: "Action Step",
        type: "action",
        disabled: false,
        uses: "actions/checkout@v4",
      } as StepItem,
    }),
  },
  {
    type: "step-script",
    label: "Script step",
    description: "Shell script (run:)",
    icon: <TerminalIcon className="w-4 h-4" />,
    color: "#F59E0B",
    defaultData: () => ({
      id: "step-script",
      label: "Script Step",
      color: "#F59E0B",
      step: {
        id: generateUUID(),
        stepId: undefined,
        name: "Script Step",
        type: "run",
        disabled: false,
        run: "echo \"Hello from PipeCraft\"\n",
        shell: "bash",
      } as StepItem,
    }),
  },
  {
    type: "service-postgres",
    label: "Service Postgres",
    description: "PostgreSQL database",
    icon: <Database className="w-4 h-4" />,
    color: "#A3E635",
    defaultData: () => ({
      id: "service-postgres",
      label: "Postgres Service",
      color: "#A3E635",
      job: {
        jobId: "job-with-service",
        name: "Job with Service",
        runsOn: "ubuntu-latest",
        continueOnError: false,
        env: {},
        outputs: {},
        steps: [],
        timeoutMinutes: 360,
        services: [{ serviceId: "postgres", image: "postgres:15-alpine", env: { POSTGRES_USER: "test", POSTGRES_PASSWORD: "test", POSTGRES_DB: "testdb" }, ports: ["5432:5432"] }],
        strategy: { failFast: true, matrix: { axes: [], include: [], exclude: [] } },
      } as unknown as JobNodeData,
    }),
  },
  {
    type: "service-redis",
    label: "Service Redis",
    description: "Redis cache",
    icon: <Server className="w-4 h-4" />,
    color: "#A3E635",
    defaultData: () => ({
      id: "service-redis",
      label: "Redis Service",
      color: "#A3E635",
      job: {
        jobId: "job-with-redis",
        name: "Job with Redis",
        runsOn: "ubuntu-latest",
        continueOnError: false,
        env: {},
        outputs: {},
        steps: [],
        timeoutMinutes: 360,
        services: [{ serviceId: "redis", image: "redis:7-alpine", ports: ["6379:6379"] }],
        strategy: { failFast: true, matrix: { axes: [], include: [], exclude: [] } },
      } as unknown as JobNodeData,
    }),
  },
];

// Terminal icon component (inline SVG)
function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

export default function NodePaletteSidebar({
  onDragBlock,
  onFileSelected,
  githubFiles = [],
  isLoadingFiles = false,
  onRefreshFiles,
  connectedRepo,
  onDisconnectRepo,
}: NodePaletteSidebarProps) {
  const [activeTab, setActiveTab] = useState<"blocks" | "github">("blocks");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["build"]));

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Drag-and-drop from palette to canvas
  const { isDragActive } = useDropzone({
    onDrop: () => {
      // When files are dropped onto the palette, treat them as YAML imports
      // (handled by the parent). No-op here.
    },
    accept: { "text/yaml": [".yml", ".yaml"] },
    multiple: true,
    disabled: true, // The palette itself doesn't accept drops; the canvas does
  });

  const handleBlockDragStart = useCallback(
    (e: React.DragEvent, blockType: DragBlockType) => {
      e.dataTransfer.setData("application/reactflow", blockType);
      e.dataTransfer.effectAllowed = "move";
      if (onDragBlock) {
        // If no canvas position yet, the DnD layer will provide it on drop
        // For now just signal intent
      }
    },
    [onDragBlock],
  );

  return (
    <div className="flex flex-col h-full bg-[#131610] border-r border-[#2A3022]">
      {/* Tabs */}
      <div className="flex border-b border-[#2A3022]">
        <button
          onClick={() => setActiveTab("blocks")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors relative",
            activeTab === "blocks"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300",
          )}
        >
          <Layers className="w-4 h-4" />
          Blocks
          {activeTab === "blocks" && (
            <motion.div
              layoutId="palette-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-500"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("github")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors relative",
            activeTab === "github"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300",
          )}
        >
          <FolderOpen className="w-4 h-4" />
          GitHub
          {activeTab === "github" && (
            <motion.div
              layoutId="palette-tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-500"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "blocks" ? (
            <BlocksTab
              key="blocks"
              blocks={DRAG_BLOCKS}
              onDragStart={handleBlockDragStart}
              isDragActive={isDragActive}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
            />
          ) : (
            <GitHubTab
              key="github"
              files={githubFiles}
              isLoading={isLoadingFiles}
              onRefresh={onRefreshFiles}
              onFileSelected={onFileSelected}
              connectedRepo={connectedRepo}
              onDisconnect={onDisconnectRepo}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocks Tab
// ---------------------------------------------------------------------------

interface BlocksTabProps {
  blocks: DragBlock[];
  onDragStart: (e: React.DragEvent, type: DragBlockType) => void;
  isDragActive: boolean;
  expandedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
}

function BlocksTab({
  blocks,
  onDragStart,
  isDragActive,
  expandedCategories,
  onToggleCategory,
}: BlocksTabProps) {
  const categories = [
    {
      name: "Triggers",
      icon: <GitBranch className="w-3.5 h-3.5" />,
      items: blocks.filter((b) => b.type === "trigger"),
    },
    {
      name: "Jobs (Runners)",
      icon: <Server className="w-3.5 h-3.5" />,
      items: blocks.filter((b) => b.type.startsWith("job-")),
    },
    {
      name: "Reusable workflows",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      items: blocks.filter((b) => b.type === "reusable-workflow"),
    },
    {
      name: "Steps",
      icon: <Type className="w-3.5 h-3.5" />,
      items: blocks.filter((b) => b.type.startsWith("step-")),
    },
    {
      name: "Services",
      icon: <Database className="w-3.5 h-3.5" />,
      items: blocks.filter((b) => b.type.startsWith("service-")),
    },
  ];

  return (
    <div className="p-2 space-y-2">
      {/* Drag-overlay indicator */}
      {isDragActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-2 rounded-lg bg-lime-500/10 border border-lime-500/30 px-3 py-2 text-center"
        >
          <p className="text-xs text-lime-300 font-medium">
            Drop on the canvas
          </p>
          <p className="text-[10px] text-lime-400/60 mt-0.5">
            Drop to create a new node
          </p>
        </motion.div>
      )}

      {categories.map((category) => (
        <div key={category.name} className="space-y-1">
          <button
            onClick={() => onToggleCategory(category.name)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-[#1D2117] transition-colors text-left"
          >
            {expandedCategories.has(category.name) ? (
              <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
            )}
            <span className="text-gray-400">{category.icon}</span>
            <span className="text-xs text-gray-300 font-medium">
              {category.name}
            </span>
            <span className="ml-auto text-[10px] text-gray-500 bg-[#1D2117] px-1.5 py-0.5 rounded">
              {category.items.length}
            </span>
          </button>

          <AnimatePresence>
            {expandedCategories.has(category.name) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="pl-5 space-y-0.5">
                  {category.items.map((block) => (
                    <DraggableBlock
                      key={block.type}
                      block={block}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraggableBlock
// ---------------------------------------------------------------------------

interface DraggableBlockProps {
  block: DragBlock;
  onDragStart: (e: React.DragEvent, type: DragBlockType) => void;
}

function DraggableBlock({ block, onDragStart }: DraggableBlockProps) {
  const canDrag = !["step-action", "step-script"].includes(block.type);

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onDragStart(e, block.type)}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing",
        "hover:bg-[#1D2117] transition-colors group",
        canDrag && "has-drop-shadow",
      )}
      style={{
        boxShadow: canDrag ? "0 1px 2px rgba(0,0,0,0.3)" : undefined,
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: block.color + "18",
          color: block.color,
        }}
      >
        {block.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-200 font-medium truncate block">
          {block.label}
        </div>
        <div className="text-[10px] text-gray-500 truncate block leading-tight">
          {block.description}
        </div>
      </div>

      {canDrag && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="w-3 h-3 text-gray-500" />
          <span className="text-[9px] text-gray-500">Add</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitHub Tab
// ---------------------------------------------------------------------------

interface GitHubTabProps {
  files: Array<{ path: string; name: string; sha: string; size: number }>;
  isLoading: boolean;
  onRefresh: (() => void) | undefined;
  onFileSelected: ((filePath: string) => void) | undefined;
  connectedRepo: string | null | undefined;
  onDisconnect: (() => void) | undefined;
}

function GitHubTab({
  files,
  isLoading,
  onRefresh,
  onFileSelected,
  connectedRepo,
  onDisconnect,
}: GitHubTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Connected repo header */}
      <div className="p-3 border-b border-[#2A3022] bg-[#0D0F0A]/50">
        {connectedRepo ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-lime-500/20 flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-3 h-3 text-lime-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-200 font-medium truncate block">
                  {connectedRepo}
                </div>
                <div className="text-[10px] text-gray-500">
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="p-1.5 rounded-md hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </button>
              )}
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                  title="Disconnect"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 text-center py-2">
            Connect a GitHub repository to import files
          </div>
        )}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#2A3022]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
          />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 text-gray-500 animate-spin mr-2" />
            <span className="text-xs text-gray-500">Loading...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-6">
            {searchQuery ? "No matching files" : "No files found"}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => onFileSelected?.(file.path)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left transition-colors group",
                "hover:bg-[#1D2117]",
              )}
            >
              <FileCode className="w-4 h-4 text-amber-400/70 flex-shrink-0" />
              <span className="text-xs text-gray-300 truncate flex-1 font-mono">
                {file.name}
              </span>
              <span className="text-[9px] text-gray-500 flex-shrink-0">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
