"use client";

import React from "react";
import { useReactFlow } from "@xyflow/react";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CustomControlsProps {
  className?: string;
}

export default function CustomControls({ className }: CustomControlsProps) {
  const reactFlow = useReactFlow();
  const [showMinimap, setShowMinimap] = React.useState(true);

  const handleZoomIn = () => {
    reactFlow.zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    reactFlow.zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    reactFlow.fitView({ padding: 0.2, duration: 300 });
  };

  const handleToggleMinimap = () => {
    setShowMinimap((prev: boolean) => !prev);
  };

  const handleUndo = () => {
    // Zustand undo is handled at the store level; trigger via a custom event
    window.dispatchEvent(new CustomEvent("pipecraft:undo"));
  };

  const handleRedo = () => {
    window.dispatchEvent(new CustomEvent("pipecraft:redo"));
  };

  return (
    <motion.div
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl bg-[#131610] border border-[#2A3022] px-1.5 py-1.5 shadow-lg shadow-black/40 ",
        className,
      )}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Undo / Redo */}
      <button
        onClick={handleUndo}
        title="Undo (Ctrl+Z)"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-[#ACB5A2] transition-colors",
          "hover:bg-[#2A3022] hover:text-white",
        )}
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={handleRedo}
        title="Redo (Ctrl+Shift+Z)"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-[#ACB5A2] transition-colors",
          "hover:bg-[#2A3022] hover:text-white",
        )}
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#2A3022] mx-1" />

      {/* Zoom controls */}
      <button
        onClick={handleZoomOut}
        title="Zoom Out"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-[#ACB5A2] transition-colors",
          "hover:bg-[#2A3022] hover:text-white",
        )}
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* Current zoom level indicator */}
      <div className="flex items-center justify-center w-14 h-8 rounded-lg bg-[#0D0F0A] border border-[#2A3022] text-xs text-[#ACB5A2] font-mono">
        {Math.round(reactFlow.getZoom() * 100)}%
      </div>

      <button
        onClick={handleZoomIn}
        title="Zoom In"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-[#ACB5A2] transition-colors",
          "hover:bg-[#2A3022] hover:text-white",
        )}
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#2A3022] mx-1" />

      {/* Fit View */}
      <button
        onClick={handleFitView}
        title="Fit to View"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-[#ACB5A2] transition-colors",
          "hover:bg-[#2A3022] hover:text-white",
        )}
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Toggle minimap */}
      <button
        onClick={handleToggleMinimap}
        title={showMinimap ? "Hide Minimap" : "Show Minimap"}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
          showMinimap
            ? "text-[#A3E635] bg-[#A3E635]/10"
            : "text-[#ACB5A2]",
          "hover:bg-[#2A3022] hover:text-white",
        )}
      >
        <MapIcon className="w-4 h-4" />
      </button>

    </motion.div>
  );
}

