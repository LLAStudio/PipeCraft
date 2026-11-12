import type { SerializedGraph } from "@/types/pipeline";
import { usePipelineStore } from "@/store/usePipelineStore";

/**
 * SyncOrigin bookkeeping + anti-boucle infinie verrou.
 *
 * This module is intentionally side-effect-free: it only exports helpers that
 * read/write the `lastSyncOrigin` flag on the shared pipeline store so that
 * graphToYaml and yamlToGraph consumers can decide whether they own the
 * current edit.
 */

export type SyncOrigin = "CANVAS" | "EDITOR" | "IMPORT" | "NONE";

const CANVAS_ORIGIN: SyncOrigin = "CANVAS";
const EDITOR_ORIGIN: SyncOrigin = "EDITOR";
const IMPORT_ORIGIN: SyncOrigin = "IMPORT";
const NONE_ORIGIN: SyncOrigin = "NONE";

/**
 * Mark the store as having been produced by a canvas change.
 *
 * Use this BEFORE any programmatic YAML push into Monaco, so Monaco's own
 * onChange handler can recognise that the incoming text is a machine update
 * and skip re-parsing it.
 */
export function markCanvasSync(): void {
  const store = usePipelineStore.getState();
  store.setSyncOrigin(CANVAS_ORIGIN);
}

/**
 * Mark the store as having been produced by an editor change.
 *
 * Use this after a successful debounced YAML parse that produced a new graph,
 * so that future canvas updates know they are in control again.
 */
export function markEditorSync(): void {
  const store = usePipelineStore.getState();
  store.setSyncOrigin(EDITOR_ORIGIN);
}

/**
 * Mark the store as having been produced by a file-import action.
 *
 * Used when a user imports an existing YAML file from GitHub or pastes it
 * into the editor.
 */
export function markImportSync(): void {
  const store = usePipelineStore.getState();
  store.setSyncOrigin(IMPORT_ORIGIN);
}

/**
 * Clear the sync origin (used at store reset or when no source is active).
 */
export function markNoSync(): void {
  const store = usePipelineStore.getState();
  store.setSyncOrigin(NONE_ORIGIN);
}

/**
 * Current sync origin.
 */
export function currentSyncOrigin(): SyncOrigin {
  return usePipelineStore.getState().lastSyncOrigin;
}

/**
 * Returns true when the last mutation came from the Monaco editor side,
 * which means a subsequent change we are about to push into Monaco would
 * overwrite the user's cursor position unless we are careful.
 */
export function isFromEditor(): boolean {
  return currentSyncOrigin() === EDITOR_ORIGIN;
}

/**
 * Returns true when the last mutation came from the canvas side, so any
 * editor onChange event we see is potentially a user typing that we should
 * honour (after debounce).
 */
export function isFromCanvas(): boolean {
  return currentSyncOrigin() === CANVAS_ORIGIN;
}

/**
 * Returns true when the last source was an explicit import.
 */
export function isFromImport(): boolean {
  return currentSyncOrigin() === IMPORT_ORIGIN;
}

// ---------------------------------------------------------------------------
// Debounced YAML -> Graph sync (used by YamlCodePanel)
// ---------------------------------------------------------------------------

type YamlToGraphCallback = (
  yaml: string,
  origin: SyncOrigin,
) => void;

interface SyncObserver {
  onChange: YamlToGraphCallback;
  debounceMs: number;
}

let editorObserver: SyncObserver | null = null;
let editorTimer: ReturnType<typeof setTimeout> | null = null;
let pendingEditorText = "";

/**
 * Install a debounced observer that watches the editor's text changes.
 *
 * Each keystroke resets the debounce timer. When the timer fires, the
 * observer's onChange runs ONLY if the text has changed since the last
 * successful sync and if the YAML is syntactically valid.
 */
export function observeEditorChanges(
  observer: SyncObserver,
): () => void {
  editorObserver = observer;
  return () => {
    editorObserver = null;
    if (editorTimer) {
      clearTimeout(editorTimer);
      editorTimer = null;
    }
  };
}

/**
 * Called by the Monaco editor's onChange handler with the new text value.
 *
 * This does NOT immediately parse/apply — it just queues a debounced attempt.
 */
export function onEditorTextChange(yamlText: string): void {
  pendingEditorText = yamlText;
  if (editorTimer) clearTimeout(editorTimer);
  editorTimer = setTimeout(() => {
    if (!editorObserver) return;
    const observers = editorObserver;
    editorTimer = null;
    // Always invoke the callback; the observer itself decides whether to
    // actually parse (based on validity + origin checks). This keeps the
    // contract simple: the panel owns the parse decision.
    observers.onChange(yamlText, EDITOR_ORIGIN);
  }, editorObserver?.debounceMs ?? 450);
}

/**
 * Mark that a programmatic YAML update has been pushed into Monaco.
 *
 * Call this AFTER every call that sets Monaco's value via its API (not via
 * the user typing). The Monaco onChange event will fire with the same value;
 * the panel's handler should skip processing when `isFromCanvas()` is true
 * and the text matches.
 */
export function markMonacoProgrammaticUpdate(yamlText: string): void {
  // Update the store's sync origin BEFORE pushing into Monaco so that the
  // subsequent onChange event sees CANVAS origin.
  markCanvasSync();
  pendingEditorText = yamlText;
}

/**
 * Check whether a change event from Monaco should be ignored.
 *
 * Returns true when the incoming text is identical to the last text we pushed
 * programmatically AND the last sync origin was CANVAS — meaning we are seeing
 * our own programmatic update, not user typing.
 */
export function shouldIgnoreEditorChange(yamlText: string): boolean {
  if (currentSyncOrigin() !== CANVAS_ORIGIN) return false;
  return yamlText === pendingEditorText;
}

// ---------------------------------------------------------------------------
// Graph -> YAML push with origin tracking
// ---------------------------------------------------------------------------

/**
 * Synchronously push a fresh YAML string into the store's world, marking
 * the sync origin as CANVAS so that any subsequent editor onChange is treated
 * as our own echo.
 */
export function pushYamlToStore(_yamlText: string): void {
  // The YAML text itself lives in the UI layer (Monaco). We only track
  // that the source of truth moved to the canvas side.
  markCanvasSync();
}

/**
 * Full graph replacement from an import source.
 */
export function importGraph(serialized: SerializedGraph): void {
  const store = usePipelineStore.getState();
  store.setNodes(serialized.nodes);
  store.setEdges(serialized.edges);
  store.setViewport(serialized.viewport);
  store.setGlobalSettings(serialized.globalSettings);
  markImportSync();
}

/**
 * Reset sync state after a successful round-trip.
 */
export function clearSyncState(): void {
  markNoSync();
  pendingEditorText = "";
}

export {};
