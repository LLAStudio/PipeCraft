"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConditionBadgeProps {
  condition?: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "default" | "warning" | "error";
}

export default function ConditionBadge({
  condition,
  className,
  size = "md",
  variant = "default",
}: ConditionBadgeProps) {
  if (!condition) return null;

  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md flex-shrink-0",
        textSize,
        size === "sm" ? "px-1" : "px-1.5 py-0.5",
        variant === "warning"
          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          : variant === "error"
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : "bg-lime-500/10 text-lime-400 border border-lime-500/20",
        className,
      )}
    >
      <AlertTriangle className={cn(iconSize, "flex-shrink-0")} />
      <span className="truncate max-w-[120px] sm:max-w-[180px] font-mono">
        {condition}
      </span>
    </span>
  );
}
