"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Download,
  Layers,
  GitBranch,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { officialTemplates, searchOfficialTemplates } from "@/lib/templates/defaultTemplates";
import type { OfficialTemplate } from "@/lib/templates/defaultTemplates";

const categories = ["All", "Frontend", "Backend", "Docker & K8s", "Mobile", "Security"];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");


  const filteredTemplates = useMemo(() => {
    let result = searchOfficialTemplates(searchQuery);
    if (activeCategory !== "All") {
      result = result.filter((t) => t.category === activeCategory);
    }
    return result;
  }, [searchQuery, activeCategory]);

  const handleUseTemplate = (template: OfficialTemplate) => {
    window.location.href = `/editor/template-${template.id}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0D08] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-lime-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Galerie de Templates
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Add a ready-made template to your editor in one click
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl bg-[#131610] border border-[#2A3022]">
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono">
              {officialTemplates.length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Official templates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono">
              {categories.filter((c) => c !== "All").length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono">
              {officialTemplates.reduce((sum, t) => sum + t.tags.length, 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total tags</div>
          </div>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, language or framework..."
              className="w-full bg-[#131610] border border-[#2A3022] rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {/* Category filter */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                    activeCategory === cat
                      ? "bg-lime-500/15 text-lime-300 border border-lime-500/25"
                      : "bg-[#1D2117] text-gray-400 border border-[#2A3022] hover:border-gray-600 hover:text-gray-200",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, idx) => (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => handleUseTemplate(template)}
                className="group relative p-5 rounded-xl bg-[#131610] border border-[#2A3022] hover:border-[#48513B] hover:bg-[#181B13] transition-all cursor-pointer"
              >
                {/* Icon + category + title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-lime-300/20 transition-colors">
                    <div className="w-5 h-5 rounded bg-lime-400 flex items-center justify-center">
                      <GitBranch className="w-3 h-3 text-[#0E1207]" />
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#1D2117] border border-[#2A3022] text-[9px] font-medium text-gray-300 whitespace-nowrap">
                    {template.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-lime-300 transition-colors leading-snug mb-1">
                  {template.title}
                </h3>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 bg-[#1D2117] border border-[#2A3022] rounded text-[9px] text-gray-400 font-mono hover:text-gray-200 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 5 && (
                    <span className="px-1.5 py-0.5 bg-[#1D2117] border border-[#2A3022] rounded text-[9px] text-gray-500 font-mono">
                      +{template.tags.length - 5}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 border-t border-[#2A3022] pt-3">
                  <span className="flex items-center gap-0.5">
                    <Layers className="w-3 h-3" />
                    {template.graphJson.nodes.length} nodes
                  </span>
                  <span className="flex items-center gap-0.5">
                    <GitBranch className="w-3 h-3" />
                    {template.graphJson.edges.length} edges
                  </span>
                  <span className="flex items-center gap-0.5 ml-auto">
                    <Download className="w-3 h-3" />
                    Utilisation: 0
                  </span>
                </div>

                {/* Hover overlay */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                  )}
                >
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D2117] border border-[#2A3022] text-xs text-gray-300">
                    Use this template
                    <ArrowRight className="w-3.5 h-3.5 text-lime-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="mt-12 p-12 rounded-xl bg-[#131610] border border-[#2A3022] text-center">
            <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-lime-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              No templates found
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Try a different search or another category.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="px-4 py-2 rounded-lg text-sm text-lime-300 border border-lime-500/20 hover:bg-lime-300/10 transition-colors"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 p-4 rounded-xl bg-[#0D0F0A] border border-[#2A3022]">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">All official templates</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            These templates are designed and validated by the PipeCraft team. They cover
            common CI/CD use cases for the main technologies
            (Next.js, Node.js, Docker, Kubernetes, React Native, Rust, Go, Hugo/Astro)
            and apply DevSecOps security best practices.
          </p>
        </div>
      </div>
    </div>
  );
}
