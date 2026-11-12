"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Check, Copy, Download, Eye, Code, AlertTriangle, RefreshCw } from "lucide-react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { graphToYaml } from "@/lib/compiler/graphToYaml";
import { parseYamlToGraph } from "@/lib/compiler/yamlToGraph";
import { validateYamlString } from "@/lib/validation/schemaValidator";
import { cn } from "@/lib/utils";

function definePipeCraftTheme(monacoInstance: Monaco): void {
monacoInstance.editor.defineTheme("pipecraft-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6A9955" },
    { token: "keyword", foreground: "C792EA" },
    { token: "string", foreground: "C3E88D" },
    { token: "number", foreground: "F78C6C" },
    { token: "type", foreground: "FFCB6B" },
  ],
  colors: {
    "editor.background": "#0D0F0A",
    "editor.foreground": "#D4D4D4",
    "editor.lineHighlightBackground": "#1D2117",
    "editorCursor.foreground": "#A3E635",
    "editorLineNumber.foreground": "#48513B",
    "editorLineNumber.activeForeground": "#A3E635",
    "editorIndentGuide.background": "#2A3022",
  },
});
}

const DEBOUNCE_MS = 450;

interface YamlCodePanelProps {
  readOnly?: boolean;
  onCopy?: () => void;
  onDownload?: () => void;
  activeTab: "code" | "validation";
  hideTabs?: boolean;
  onTabChange: (tab: "code" | "validation") => void;
}

export default function YamlCodePanel({
  readOnly = false,
  hideTabs = false,
  onCopy,
  onDownload,
  activeTab,
  onTabChange,
}: YamlCodePanelProps) {
  const nodes = usePipelineStore((state) => state.nodes);
  const edges = usePipelineStore((state) => state.edges);
  const viewport = usePipelineStore((state) => state.viewport);
  const globalSettings = usePipelineStore((state) => state.globalSettings);
  const filePath = usePipelineStore((state) => state.filePath);
  const lastSyncOrigin = usePipelineStore((state) => state.lastSyncOrigin);
  const setNodes = usePipelineStore((state) => state.setNodes);
  const setEdges = usePipelineStore((state) => state.setEdges);
  const setViewport = usePipelineStore((state) => state.setViewport);
  const setGlobalSettings = usePipelineStore((state) => state.setGlobalSettings);
  const setSyncOrigin = usePipelineStore((state) => state.setSyncOrigin);

  const generated = useMemo(
    () => graphToYaml({ nodes, edges, globalSettings, viewport }),
    [nodes, edges, globalSettings, viewport],
  );

  const [text, setText] = useState(generated);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const editingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canvas -> editor
  useEffect(() => {
    if (lastSyncOrigin === "EDITOR" || editingRef.current) return;
    setText(generated);
    setParseError(null);
  }, [generated, lastSyncOrigin]);

  const applyEditorText = useCallback(
    (value: string) => {
      const result = parseYamlToGraph(value);
      if (!result.success || !result.graph) {
        setParseError(result.error ?? "Invalid YAML");
        return;
      }
      setParseError(null);
      setSyncOrigin("EDITOR");
      setNodes(result.graph.nodes);
      setEdges(result.graph.edges);
      setViewport(result.graph.viewport);
      setGlobalSettings(result.graph.globalSettings);
    },
    [setEdges, setGlobalSettings, setNodes, setSyncOrigin, setViewport],
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const next = value ?? "";
      setText(next);
      if (readOnly) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => applyEditorText(next), DEBOUNCE_MS);
    },
    [applyEditorText, readOnly],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleFormat = useCallback(() => {
    const result = parseYamlToGraph(text);
    if (result.success && result.graph) {
      setText(graphToYaml(result.graph));
      setParseError(null);
    } else {
      setParseError(result.error ?? "Invalid YAML");
    }
  }, [text]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy?.();
    } catch {
      setParseError("Could not copy to clipboard");
    }
  }, [text, onCopy]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filePath.split("/").pop() || "workflow.yml";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    onDownload?.();
  }, [filePath, onDownload, text]);

  const schema = useMemo(() => validateYamlString(text), [text]);

  return (
    <div className="flex flex-col h-full bg-[#0D0F0A]">
      <div className={cn(
        "flex items-center px-3 py-1.5 bg-[#131610]",
        hideTabs ? "justify-end" : "justify-between border-b border-[#2A3022]",
      )}>
        {!hideTabs && <div className="flex gap-1">
          <button
            onClick={() => onTabChange("code")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors",
              activeTab === "code"
                ? "bg-lime-500/20 text-lime-300"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            <Code className="w-3.5 h-3.5" />
            Code YAML
          </button>
          <button
            onClick={() => onTabChange("validation")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors",
              activeTab === "validation"
                ? "bg-lime-500/20 text-lime-300"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            Validation
          </button>
        </div>}

        <div className="flex items-center gap-1.5">
          <span className="hidden lg:inline text-[10px] text-gray-500 mr-1">
            {lastSyncOrigin === "EDITOR" ? "Editor → canvas" : "Canvas → YAML"}
          </span>
          <button
            onClick={handleFormat}
            title="Format YAML"
            className="p-1.5 rounded hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy"
            className="p-1.5 rounded hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download"
            className="p-1.5 rounded hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {parseError && (
        <div className="flex items-start gap-1.5 px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-[11px] text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="font-mono">{parseError}</span>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeTab === "code" ? (
          <Editor
            height="100%"
            defaultLanguage="yaml"
            theme="pipecraft-dark"
            beforeMount={definePipeCraftTheme}
            value={text}
            onChange={handleEditorChange}
            options={{
              readOnly,
              minimap: { enabled: false },
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 13,
              lineHeight: 20,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: "on",
              renderLineHighlight: "line",
              padding: { top: 12, bottom: 12 },
              smoothScrolling: true,
              cursorSmoothCaretAnimation: "on",
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              quickSuggestions: false,
              fixedOverflowWidgets: true,
            }}
          />
        ) : (
          <div className="p-3 space-y-2 text-xs">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                schema.valid
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                  : "border-red-500/30 bg-red-500/5 text-red-300",
              )}
            >
              {schema.valid ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{schema.valid ? "Valid GitHub Actions schema" : "YAML does not match the schema"}</span>
            </div>
            {!schema.valid &&
              schema.errors.map((error, index) => (
                <div
                  key={`${error.keyword}-${index}`}
                  className="rounded-lg border border-[#2A3022] bg-[#131610] px-3 py-2"
                >
                  <div className="font-mono text-[10px] text-amber-400">{error.keyword}</div>
                  <div className="text-gray-300">{error.message}</div>
                </div>
              ))}
            <div className="text-[10px] text-gray-500">
              {text.split("\n").length} lines · {nodes.length} nodes · {edges.length} edges
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
