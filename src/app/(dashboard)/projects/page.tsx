"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus,
  FolderOpen,
  GitBranch,
  FileCode,
  Clock,
  ChevronRight,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { officialTemplates } from "@/lib/templates/defaultTemplates";

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  repoOwner: string | null;
  repoName: string | null;
  repoBranch: string | null;
  filePath: string;
  isValid: boolean;
  securityScore: number;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateFormState {
  name: string;
  description: string;
  templateId: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  filePath: string;
}

const EMPTY_FORM: CreateFormState = {
  name: "",
  description: "",
  templateId: officialTemplates[0]?.id ?? "",
  repoOwner: "",
  repoName: "",
  repoBranch: "main",
  filePath: ".github/workflows/ci.yml",
};

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return "just now";
}

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setNeedsAuth(false);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (response.status === 401) {
        setNeedsAuth(true);
        setProjects([]);
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to load");
      }
      const payload = (await response.json()) as { projects: ProjectSummary[] };
      setProjects(payload.projects);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleDelete = useCallback(
    async (project: ProjectSummary) => {
      if (!window.confirm(`Permanently delete “${project.name}”?`)) return;
      setDeletingId(project.id);
      try {
        const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Delete failed");
        }
        setProjects((current) => current.filter((candidate) => candidate.id !== project.id));
        toast.success("Project deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const handleCreate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      if (!form.name.trim()) {
        setFormError("Project name is required");
        return;
      }

      setIsCreating(true);
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            templateId: form.templateId || undefined,
            repoOwner: form.repoOwner.trim() || undefined,
            repoName: form.repoName.trim() || undefined,
            repoBranch: form.repoBranch.trim() || undefined,
            filePath: form.filePath.trim() || undefined,
          }),
        });

        if (response.status === 401) {
          setNeedsAuth(true);
          setCreateOpen(false);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          project?: ProjectSummary;
          error?: string;
        };
        if (!response.ok || !payload.project) {
          throw new Error(payload.error ?? "Could not create project");
        }

        setProjects((current) => [payload.project as ProjectSummary, ...current]);
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        toast.success("Project created");
        router.push(`/editor/${payload.project.id}`);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Could not create project");
      } finally {
        setIsCreating(false);
      }
    },
    [form, router],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      const repo = [project.repoOwner, project.repoName].filter(Boolean).join("/");
      return [project.name, project.description ?? "", repo, project.filePath]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [projects, search]);

  const stats = useMemo(() => {
    const connectedRepos = new Set(
      projects
        .filter((project) => project.repoOwner && project.repoName)
        .map((project) => `${project.repoOwner}/${project.repoName}`),
    );
    const files = new Set(projects.map((project) => project.filePath));
    const averageScore =
      projects.length > 0
        ? Math.round(projects.reduce((sum, project) => sum + project.securityScore, 0) / projects.length)
        : 0;
    return [
      { label: "Projects", value: String(projects.length), icon: FolderOpen, color: "text-lime-400" },
      { label: "Connected repositories", value: String(connectedRepos.size), icon: GitBranch, color: "text-lime-400" },
      { label: "YAML files", value: String(files.size), icon: FileCode, color: "text-lime-400" },
      { label: "Security score", value: projects.length > 0 ? String(averageScore) : "—", icon: AlertTriangle, color: "text-lime-400" },
    ];
  }, [projects]);

  return (
    <div className="min-h-screen bg-[#0B0D08] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">My projects</h1>
            <p className="text-sm text-gray-500">Saved CI/CD pipelines and connected repositories</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadProjects()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1D2117] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Actualiser
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setCreateOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-lime-400 text-[#0E1207] hover:bg-lime-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New project
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="p-4 min-h-[88px] rounded-xl bg-[#131610] border border-[#2A3022] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-white font-mono mt-2">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects by name, repository or file..."
            className="w-full bg-[#131610] border border-[#2A3022] rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-colors"
          />
        </div>

        {needsAuth && (
          <div className="p-8 rounded-xl bg-[#131610] border border-amber-500/30 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Sign-in required</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
              Sign in with GitHub to view and manage your projects.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-lime-400 text-[#0E1207] hover:bg-lime-300 transition-colors"
            >
              Sign in
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {loadError && !needsAuth && (
          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-red-300 font-medium">Could not load projects</div>
              <div className="text-xs text-gray-500 mt-0.5">{loadError}</div>
            </div>
            <button
              onClick={() => void loadProjects()}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#1D2117] border border-[#2A3022] text-gray-300 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && projects.length === 0 && !needsAuth && !loadError && (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading projects…
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((project, index) => {
              const repo = [project.repoOwner, project.repoName].filter(Boolean).join("/");
              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="group p-4 rounded-xl bg-[#131610] border border-[#2A3022] hover:border-[#48513B] hover:bg-[#181B13] transition-all cursor-pointer"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-lime-500/15 flex items-center justify-center flex-shrink-0">
                          <GitBranch className="w-3.5 h-3.5 text-lime-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate group-hover:text-lime-300 transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-[10px] text-gray-500 font-mono truncate">
                            {repo || "No repository connected"} · {project.repoBranch ?? "main"}
                          </p>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          {project.filePath}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {relativeTime(project.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" />
                          {project.nodeCount} nodes · {project.edgeCount} edges
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-mono",
                            project.securityScore >= 90
                              ? "bg-emerald-500/10 text-emerald-400"
                              : project.securityScore >= 70
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400",
                          )}
                        >
                          {project.securityScore}/100
                        </span>
                        {!project.isValid && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/10 text-red-400">
                            invalid
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/editor/${project.id}`);
                        }}
                        className="p-1.5 rounded-md hover:bg-[#2A3022] text-gray-500 hover:text-white transition-colors"
                        title="Open in editor"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(project);
                        }}
                        disabled={deletingId === project.id}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 ml-1" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {!isLoading && !needsAuth && !loadError && filtered.length === 0 && (
          <div className="mt-6 p-12 rounded-xl bg-[#131610] border border-[#2A3022] text-center">
            <div className="w-12 h-12 rounded-xl bg-lime-500/10 flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-6 h-6 text-lime-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              {projects.length === 0 ? "No projects yet" : "No results"}
            </h3>
            <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
              {projects.length === 0
                ? "Create your first CI/CD pipeline from an official template."
                : "Try another project name, repository or file."}
            </p>
            {projects.length === 0 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-lime-400 text-[#0E1207] hover:bg-lime-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New project
                </button>
                <Link
                  href="/templates"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1D2117] transition-colors"
                >
                  Browse templates
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !isCreating && setCreateOpen(false)}
          >
            <motion.form
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              onSubmit={handleCreate}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg bg-[#131610] border border-[#2A3022] rounded-xl shadow-lg shadow-black/40 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A3022]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-lime-500/15 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-lime-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">New project</h2>
                    <p className="text-[10px] text-gray-500">The pipeline will be saved to the database</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={isCreating}
                  className="p-1 rounded-md hover:bg-[#2A3022] text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Project name</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Next.js CI"
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Starting template</label>
                  <select
                    value={form.templateId}
                    onChange={(event) => setForm({ ...form, templateId: event.target.value })}
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-lime-500/50"
                  >
                    {officialTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Description (optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={2}
                    placeholder="Build, lint and test…"
                    className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Owner GitHub</label>
                    <input
                      value={form.repoOwner}
                      onChange={(event) => setForm({ ...form, repoOwner: event.target.value })}
                      placeholder="my-org"
                      className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Repository</label>
                    <input
                      value={form.repoName}
                      onChange={(event) => setForm({ ...form, repoName: event.target.value })}
                      placeholder="my-app"
                      className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">Branch</label>
                    <input
                      value={form.repoBranch}
                      onChange={(event) => setForm({ ...form, repoBranch: event.target.value })}
                      className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1 block">YAML file</label>
                    <input
                      value={form.filePath}
                      onChange={(event) => setForm({ ...form, filePath: event.target.value })}
                      className="w-full bg-[#0D0F0A] border border-[#2A3022] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-lime-500/50 font-mono"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {formError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#2A3022] bg-[#0D0F0A]">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={isCreating}
                  className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1D2117]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-lime-400 text-[#0E1207] hover:bg-lime-300 disabled:opacity-60"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isCreating ? "Creating…" : "Create project"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
