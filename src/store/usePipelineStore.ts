"use client";

import { create } from "zustand";
import type {
  GraphNode,
  ReactFlowEdge,
  Viewport,
  WorkflowGlobalSettings,
} from "@/types/pipeline";

export type SyncOrigin = "CANVAS" | "EDITOR" | "IMPORT" | "NONE";

export interface PipelineStoreState {
  nodes: GraphNode[];
  edges: ReactFlowEdge[];
  viewport: Viewport;
  globalSettings: WorkflowGlobalSettings;
  selectedNodeId: string | null;
  lastSyncOrigin: SyncOrigin;
  projectId: string | null;
  projectName: string;
  repoOwner: string | null;
  repoName: string | null;
  repoBranch: string;
  filePath: string;
  activeTab: "code" | "validation";
}

export interface PipelineStoreActions {
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: ReactFlowEdge[]) => void;
  setViewport: (viewport: Viewport) => void;
  setGlobalSettings: (settings: WorkflowGlobalSettings) => void;
  setSyncOrigin: (origin: SyncOrigin) => void;
  setSelectedNodeId: (id: string | null) => void;
  setActiveTab: (tab: "code" | "validation") => void;
  setProjectMetadata: (
    projectId: string | null,
    projectName: string,
    repoOwner: string | null,
    repoName: string | null,
    repoBranch: string,
    filePath: string,
  ) => void;
  reset: () => void;
}

export type PipelineStore = PipelineStoreState & PipelineStoreActions;

const DEFAULT_SETTINGS: WorkflowGlobalSettings = {
  name: "New CI/CD Pipeline",
  env: {},
  permissions: { contents: "read" },
};

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

function initialState(): PipelineStoreState {
  return {
    nodes: [],
    edges: [],
    viewport: { ...DEFAULT_VIEWPORT },
    globalSettings: { ...DEFAULT_SETTINGS },
    selectedNodeId: null,
    lastSyncOrigin: "NONE",
    projectId: null,
    projectName: "New CI/CD Pipeline",
    repoOwner: null,
    repoName: null,
    repoBranch: "main",
    filePath: ".github/workflows/ci.yml",
    activeTab: "code",
  };
}

export const usePipelineStore = create<PipelineStore>()((set) => ({
  ...initialState(),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),
  setGlobalSettings: (globalSettings) => set({ globalSettings }),
  setSyncOrigin: (lastSyncOrigin) => set({ lastSyncOrigin }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setProjectMetadata: (
    projectId,
    projectName,
    repoOwner,
    repoName,
    repoBranch,
    filePath,
  ) => set({ projectId, projectName, repoOwner, repoName, repoBranch, filePath }),
  reset: () => set(initialState()),
}));

/** Returns the node currently selected on the canvas, if any. */
export function getSelectedNode(state: PipelineStoreState): GraphNode | undefined {
  if (!state.selectedNodeId) return undefined;
  return state.nodes.find((node) => node.id === state.selectedNodeId);
}

/** Returns the job payload of the selected node, if it carries one. */
export function getSelectedJob(state: PipelineStoreState) {
  const node = getSelectedNode(state);
  return node?.data.job;
}
