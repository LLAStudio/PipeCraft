"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toPng, toSvg } from "html-to-image";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Upload,
  GitPullRequest,
  Save,
  Loader2,
  Check,
  CloudOff,
  Pencil,
  AlertTriangle,
  PanelRight,
} from "lucide-react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { parseYamlToGraph } from "@/lib/compiler/yamlToGraph";
import { validateGraphSummary } from "@/lib/validation/graphValidator";
import { lintSecurity } from "@/lib/validation/securityLinter";
import { calculateFinopsSafe, formatFinopsSummary } from "@/lib/compiler/finopsCalculator";
import { markCanvasSync, markEditorSync } from "@/lib/compiler/astSyncManager";
import { officialTemplates } from "@/lib/templates/defaultTemplates";
import { autoLayout } from "@/lib/compiler/autoLayout";
import { isSerializedGraph } from "@/lib/projects/serialize";
import YamlCodePanel from "@/components/editor/YamlCodePanel";
import ValidationConsole from "@/components/editor/ValidationConsole";
import NodePaletteSidebar from "@/components/canvas/panels/NodePaletteSidebar";
import PropertyInspector from "@/components/canvas/panels/PropertyInspector";
import PublishGithubModal from "@/components/modals/PublishGithubModal";
import LocalActModal from "@/components/modals/LocalActModal";
import ShareExportModal from "@/components/modals/ShareExportModal";

const FlowCanvas = dynamic(() => import("@/components/canvas/FlowCanvas").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0D0F0A] text-gray-500">
      Loading canvas…
    </div>
  ),
});

type ConsoleTab = "errors" | "security" | "finops";
type SaveState = "local" | "saved" | "pending" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 1500;

interface SignatureInput {
  nodes: unknown;
  edges: unknown;
  globalSettings: unknown;
  name: string;
  filePath: string;
}

function buildSignature(input: SignatureInput): string {
  return JSON.stringify(input);
}

export default function EditorPage() {
  const router = useRouter();
  const store = usePipelineStore();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [bottomHeight, setBottomHeight] = useState(34);
  const [bottomTab, setBottomTab] = useState<"code" | "validation">("code");
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("errors");

  const [publishOpen, setPublishOpen] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<"direct_commit" | "pull_request">("direct_commit");
  const [commitMessage, setCommitMessage] = useState("Update workflow via PipeCraft");
  const [prTitle, setPrTitle] = useState("Update workflow via PipeCraft");
  const [prBody, setPrBody] = useState("Generated with PipeCraft.");

  const [canSave, setCanSave] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("local");
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const autoFitCanvas = !projectId || projectId === "demo" || projectId === "sandbox";

  // Load the persisted project, or bootstrap a template when there is none.
  useEffect(() => {
    const state = usePipelineStore.getState();
    if (state.nodes.length > 0) return;
    let cancelled = false;

    const bootstrap = async () => {
      if (projectId && projectId !== "sandbox") {
        try {
          const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
          if (response.ok) {
            const payload = (await response.json()) as {
              project?: {
                name: string;
                repoOwner: string | null;
                repoName: string | null;
                repoBranch: string | null;
                filePath: string;
                graphJson: unknown;
              };
            };
            const project = payload.project;
            if (!cancelled && project && isSerializedGraph(project.graphJson)) {
              const graph = project.graphJson;
              state.setNodes(graph.nodes);
              state.setEdges(graph.edges);
              state.setViewport(graph.viewport);
              if (graph.globalSettings) state.setGlobalSettings(graph.globalSettings);
              state.setProjectMetadata(
                projectId,
                project.name,
                project.repoOwner ?? "",
                project.repoName ?? "",
                project.repoBranch ?? "main",
                project.filePath,
              );
              const hydrated = usePipelineStore.getState();
              setSavedSignature(
                buildSignature({
                  nodes: hydrated.nodes,
                  edges: hydrated.edges,
                  globalSettings: hydrated.globalSettings,
                  name: hydrated.projectName,
                  filePath: hydrated.filePath,
                }),
              );
              setCanSave(true);
              setSaveState("saved");
              return;
            }
          }
        } catch {
          // Fall back to the default template below.
        }
      }

      if (cancelled) return;
      const template = officialTemplates[0];
      if (!template) return;
      state.setNodes(autoLayout(template.graphJson.nodes, template.graphJson.edges));
      state.setEdges(template.graphJson.edges);
      state.setViewport(template.graphJson.viewport);
      state.setGlobalSettings(template.graphJson.globalSettings);
      state.setProjectMetadata(
        projectId ?? template.id,
        template.title,
        state.repoOwner,
        state.repoName,
        state.repoBranch,
        ".github/workflows/ci.yml",
      );
      setCanSave(false);
      setSaveState("local");
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Below xl the inspector is an overlay drawer and starts closed so the
  // canvas keeps a usable width.
  useEffect(() => {
    if (window.innerWidth < 1280) setRightOpen(false);
  }, []);

  useEffect(() => {
    if (store.selectedNodeId && window.innerWidth < 1280) setRightOpen(true);
  }, [store.selectedNodeId]);

  // Bottom panel resize.
  useEffect(() => {
    const handle = bottomRef.current;
    if (!handle) return;

    const onMove = (event: MouseEvent) => {
      const inside = event.clientY - 48;
      const total = window.innerHeight - 48;
      const percent = Math.max(15, Math.min(70, ((total - inside) / total) * 100));
      setBottomHeight(Math.round(percent));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    const onDown = (event: MouseEvent) => {
      event.preventDefault();
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    handle.addEventListener("mousedown", onDown);
    return () => {
      handle.removeEventListener("mousedown", onDown);
      onUp();
    };
  }, []);

  const yamlText = useMemo(
    () =>
      graphToYaml({
        nodes: store.nodes,
        edges: store.edges,
        globalSettings: store.globalSettings,
        viewport: store.viewport,
      }),
    [store.nodes, store.edges, store.globalSettings, store.viewport],
  );

  const validation = useMemo(() => {
    const graphErrors = validateGraphSummary(store.nodes, store.edges);
    const { score: securityScore, alerts: securityAlerts } = lintSecurity(
      store.nodes,
      store.globalSettings,
    );
    const finops = calculateFinopsSafe(store.nodes);
    return { graphErrors, securityScore, securityAlerts, finops };
  }, [store.nodes, store.edges, store.globalSettings]);

  const signature = useMemo(
    () =>
      buildSignature({
        nodes: store.nodes,
        edges: store.edges,
        globalSettings: store.globalSettings,
        name: store.projectName,
        filePath: store.filePath,
      }),
    [store.nodes, store.edges, store.globalSettings, store.projectName, store.filePath],
  );

  // A project is dirty as soon as the live graph diverges from the last persisted snapshot.
  const isDirty = canSave && savedSignature !== null && signature !== savedSignature;

  const displayState: SaveState = !canSave
    ? "local"
    : saveState === "error"
      ? "error"
      : saveState === "saving"
        ? "saving"
        : isDirty
          ? "pending"
          : "saved";

  const saveProject = useCallback(
    async (manual = false) => {
      if (!canSave || !projectId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const state = usePipelineStore.getState();
      const payloadSignature = buildSignature({
        nodes: state.nodes,
        edges: state.edges,
        globalSettings: state.globalSettings,
        name: state.projectName,
        filePath: state.filePath,
      });

      const sequence = ++saveSeqRef.current;
      setSaveState("saving");

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: state.projectName,
            filePath: state.filePath,
            graphJson: {
              nodes: state.nodes,
              edges: state.edges,
              globalSettings: state.globalSettings,
              viewport: state.viewport,
            },
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Save failed");
        }

        if (sequence === saveSeqRef.current) {
          setSavedSignature(payloadSignature);
          setSaveState("saved");
          setSaveError(null);
          setLastSavedAt(Date.now());
          if (manual) toast.success("Project saved");
        }
      } catch (error) {
        if (sequence === saveSeqRef.current) {
          const message = error instanceof Error ? error.message : "Save failed";
          setSaveError(message);
          setSaveState("error");
          if (manual) toast.error(message);
        }
      }
    },
    [canSave, projectId],
  );

  // Autosave: debounce store changes once the project is loaded from the API.
  useEffect(() => {
    if (!canSave || savedSignature === null) return;
    if (signature === savedSignature) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveProject();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [signature, savedSignature, canSave, saveProject]);

  // Reverting to the persisted snapshot clears a previous failure.
  useEffect(() => {
    if (saveState === "error" && savedSignature !== null && signature === savedSignature) {
      setSaveState("saved");
      setSaveError(null);
    }
  }, [signature, savedSignature, saveState]);

  // Native guard: warn before closing or reloading the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const leaveEditor = useCallback(() => {
    if (
      isDirty &&
      !window.confirm("Some changes are not saved yet. Leave the editor?")
    ) {
      return;
    }
    router.push("/projects");
  }, [isDirty, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveProject(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveProject]);

  const importYaml = useCallback(
    (text: string) => {
      const result = parseYamlToGraph(text);
      if (!result.success || !result.graph) {
        toast.error(result.error ?? "Invalid YAML");
        return;
      }
      store.setNodes(result.graph.nodes);
      store.setEdges(result.graph.edges);
      store.setViewport(result.graph.viewport);
      store.setGlobalSettings(result.graph.globalSettings);
      markEditorSync();
      toast.success("Pipeline imported");
    },
    [store],
  );

  const handlePublish = useCallback(async () => {
    if (!store.repoOwner || !store.repoName) {
      toast.error("No repository connected to this project");
      return;
    }
    setIsPublishing(true);
    try {
      const response = await fetch("/api/github/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: store.repoOwner,
          repo: store.repoName,
          branch: store.repoBranch,
          filePath: store.filePath,
          yamlContent: yamlText,
          commitMessage,
          mode: publishMode,
          prTitle,
          prBody,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Publish failed");
      }
      toast.success("Workflow published");
      setPublishOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setIsPublishing(false);
    }
  }, [commitMessage, prBody, prTitle, publishMode, store, yamlText]);

  const exportImage = useCallback(async (format: "png" | "svg") => {
    const canvas = document.querySelector<HTMLElement>(".react-flow");
    if (!canvas) {
      toast.error("Canvas introuvable");
      return;
    }
    try {
      const dataUrl = format === "png" ? await toPng(canvas) : await toSvg(canvas);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `pipecraft-${store.projectId || "pipeline"}.${format}`;
      link.click();
      toast.success(`Export ${format.toUpperCase()} generated`);
    } catch {
      toast.error(`${format.toUpperCase()} export failed`);
    }
  }, [store.projectId]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0D08] flex flex-col">
      <header className="flex-shrink-0 h-12 bg-[#131610] border-b border-[#2A3022] flex items-center px-2 lg:px-3 gap-2 lg:gap-3">
        <button
          onClick={leaveEditor}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-[#2A3022]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Back</span>
        </button>
        <div className="w-px h-5 bg-[#2A3022]" />
        <input
          value={store.projectName}
          onChange={(event) =>
            store.setProjectMetadata(
              store.projectId,
              event.target.value,
              store.repoOwner,
              store.repoName,
              store.repoBranch,
              store.filePath,
            )
          }
          className="flex-1 bg-transparent border-none text-sm font-medium text-white focus:outline-none min-w-[60px] max-w-[280px] truncate"
          placeholder="Pipeline"
        />
        <button
          onClick={() => {
            setBottomOpen(true);
            setBottomTab("validation");
            setConsoleTab("finops");
          }}
          title={`Estimated GitHub Actions runner billing: ${formatFinopsSummary(validation.finops)}. This is GitHub billing, not a PipeCraft charge — PipeCraft is free.`}
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono bg-[#1D2117] border border-[#2A3022] text-gray-400 hover:text-white whitespace-nowrap"
        >
          <span className="text-lime-400">est. ${validation.finops.costInCents.toFixed(2)}</span>
        </button>
        <button
          onClick={() => {
            setBottomOpen(true);
            setBottomTab("validation");
            setConsoleTab("security");
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono bg-[#1D2117] border border-[#2A3022] text-gray-400 hover:text-white whitespace-nowrap"
        >
          <span className="text-amber-400">S</span> {validation.securityScore}/100
        </button>
        <div className="w-px h-5 bg-[#2A3022]" />

        <div className="flex items-center gap-1 text-[10px]">
          {displayState === "local" && (
            <span className="flex items-center gap-1 text-gray-500" title="This pipeline is not linked to a saved project">
              <CloudOff className="w-3 h-3" />
              <span className="hidden lg:inline">Not saved</span>
            </span>
          )}
          {displayState === "pending" && (
            <span className="flex items-center gap-1 text-amber-400">
              <Pencil className="w-3 h-3" />
              <span className="hidden lg:inline">Unsaved changes…</span>
            </span>
          )}
          {displayState === "saving" && (
            <span className="flex items-center gap-1 text-lime-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden lg:inline">Saving…</span>
            </span>
          )}
          {displayState === "saved" && (
            <span className="flex items-center gap-1 text-emerald-400" title="Graph and YAML saved to the database">
              <Check className="w-3 h-3" />
              <span className="hidden lg:inline">
                {lastSavedAt ? `Saved at ${new Date(lastSavedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : "Saved"}
              </span>
            </span>
          )}
          {displayState === "error" && (
            <button
              onClick={() => void saveProject(true)}
              className="flex items-center gap-1 text-red-400 hover:text-red-300"
              title={saveError ?? "Save failed"}
            >
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden lg:inline">Failed — retry</span>
            </button>
          )}
        </div>

        <button
          onClick={() => void saveProject(true)}
          disabled={!canSave || saveState === "saving"}
          title="Save (Ctrl+S)"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-400 hover:text-white hover:bg-[#2A3022] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {isDirty ? (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span className="hidden lg:inline">Save</span>
        </button>

        <button
          onClick={() => setActOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-400 hover:text-white hover:bg-[#2A3022]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">act</span>
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-gray-400 hover:text-white hover:bg-[#2A3022]"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Share</span>
        </button>
        <button
          onClick={() => setRightOpen(true)}
          title="Inspector"
          className="xl:hidden flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-[#2A3022]"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPublishOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-lime-400 text-[#0E1207] hover:bg-lime-300"
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          Publish
        </button>
      </header>

      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* Left panel */}
        {leftOpen && (
          <aside className="w-[220px] xl:w-[260px] flex-shrink-0 bg-[#131610] border-r border-[#2A3022] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A3022]">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Palette
              </span>
              <button
                onClick={() => setLeftOpen(false)}
                title="Collapse palette"
                className="p-1 rounded hover:bg-[#2A3022] text-gray-500 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <NodePaletteSidebar
                onFileSelected={importYaml}
                githubFiles={[]}
                connectedRepo={store.repoName ? `${store.repoOwner}/${store.repoName}` : null}
                onDisconnectRepo={() => {}}
                onRefreshFiles={() => {}}
              />
            </div>
          </aside>
        )}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="flex-shrink-0 w-5 bg-[#131610] border-r border-[#2A3022] flex items-center justify-center hover:bg-[#1D2117] text-gray-500 hover:text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Canvas + bottom panel */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 min-h-0 relative">
            <FlowCanvas autoFit={autoFitCanvas} />
          </div>

          {bottomOpen && (
            <div
              className="flex-shrink-0 bg-[#0D0F0A] border-t border-[#2A3022] flex flex-col overflow-hidden"
              style={{ height: `${bottomHeight}%` }}
            >
              <div
                ref={bottomRef}
                className="h-1 flex-shrink-0 bg-transparent cursor-ns-resize hover:bg-lime-300/40"
              />
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2A3022] bg-[#131610] flex-shrink-0">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500">
                  {bottomTab === "code" ? "Workflow YAML" : "Validation"}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => markCanvasSync()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-500 hover:text-white hover:bg-[#2A3022]"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync
                  </button>
                  <button
                    onClick={() => {
                      const pasted = prompt("Paste your YAML");
                      if (pasted) importYaml(pasted);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-500 hover:text-white hover:bg-[#2A3022]"
                  >
                    <Upload className="w-3 h-3" />
                    Import
                  </button>
                  <button
                    onClick={() => setBottomOpen(false)}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-[#2A3022] ml-1"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {bottomTab === "code" ? (
                  <YamlCodePanel
                    readOnly={false}
                    hideTabs
                    activeTab={bottomTab}
                    onTabChange={setBottomTab}
                  />
                ) : (
                  <ValidationConsole
                    activeTab={consoleTab}
                    onTabChange={setConsoleTab}
                    onNodeClick={(id) => {
                      store.setSelectedNodeId(id);
                      setRightOpen(true);
                    }}
                  />
                )}
              </div>
            </div>
          )}
          {!bottomOpen && (
            <button
              onClick={() => setBottomOpen(true)}
              className="flex-shrink-0 h-6 bg-[#131610] border-t border-[#2A3022] flex items-center justify-center hover:bg-[#1D2117]"
            >
              <ChevronUp className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Right panel */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="hidden xl:flex flex-shrink-0 w-5 bg-[#131610] border-l border-[#2A3022] items-center justify-center hover:bg-[#1D2117] text-gray-500 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {rightOpen && (
          <>
            <div
              className="xl:hidden absolute inset-0 z-20 bg-black/50"
              onClick={() => setRightOpen(false)}
            />
            <aside className="absolute inset-y-0 right-0 z-30 flex w-[320px] max-w-[85vw] flex-col overflow-hidden border-l border-[#2A3022] bg-[#131610] shadow-2xl shadow-black/50 xl:static xl:z-auto xl:w-[360px] xl:max-w-none xl:shadow-none">
              <PropertyInspector onClose={() => setRightOpen(false)} />
            </aside>
          </>
        )}
      </div>

      <PublishGithubModal
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        yamlContent={yamlText}
        projectName={store.projectName}
        filePath={store.filePath}
        commitMessage={commitMessage}
        mode={publishMode}
        prTitle={prTitle}
        prBody={prBody}
        isPublishing={isPublishing}
        onModeChange={setPublishMode}
        onCommitMessageChange={setCommitMessage}
        onPrTitleChange={setPrTitle}
        onPrBodyChange={setPrBody}
        onPublish={handlePublish}
      />

      <LocalActModal
        isOpen={actOpen}
        onClose={() => setActOpen(false)}
        yamlContent={yamlText}
        estimatedMinutes={validation.finops.totalMinutes}
        onGenerate={() => toast.success("act command generated")}
      />

      <ShareExportModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        onExportYaml={() => toast.success("YAML downloaded")}
        onExportPng={() => void exportImage("png")}
        onExportSvg={() => void exportImage("svg")}
        onShareLink={() => toast.success("Share link copied")}
        isExporting={false}
        isCopying={false}
      />
    </div>
  );
}
