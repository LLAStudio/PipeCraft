"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  Layout,
  FolderOpen,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  {
    href: "/editor/sandbox",
    label: "Editor",
    icon: <Layout className="w-4 h-4" />,
    color: "text-lime-400",
  },
  {
    href: "/projects",
    label: "Projects",
    icon: <FolderOpen className="w-4 h-4" />,
    color: "text-emerald-400",
  },
  {
    href: "/templates",
    label: "Templates",
    icon: <GitBranch className="w-4 h-4" />,
    color: "text-lime-400",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isEditorRoute = pathname.startsWith("/editor");

  const isActive = (href: string) => {
    if (href === "/editor/sandbox") {
      return pathname.startsWith("/editor");
    }
    return pathname === href;
  };

  return (
    <div className="min-h-screen bg-[#0B0D08]">
      {/* Top navigation bar */}
      {!isEditorRoute && (
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#131610]/95 border-b border-[#2A3022]">
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-lime-500/20 flex items-center justify-center group-hover:bg-lime-300/30 transition-colors">
                <svg
                  className="w-4 h-4 text-lime-400"
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
              <span className="text-sm font-semibold text-white tracking-tight">
                PipeCraft
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    isActive(item.href)
                      ? "bg-lime-500/10 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#1D2117]",
                  )}
                >
                  <span className={cn(item.icon, isActive(item.href) ? item.color : "text-gray-500")} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* GitHub connection indicator */}
              <Link
                href="/auth/signin"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                  "hover:bg-[#2A3022] hover:text-white",
                )}
              >
                <svg
                  className="w-3.5 h-3.5 text-gray-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12C24 5.37 18.63 0 12 0Z" />
                </svg>
                <span className="text-gray-400">GitHub</span>
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2A3022] text-gray-400 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: isMobileMenuOpen ? 1 : 0,
              height: isMobileMenuOpen ? "auto" : 0,
            }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[#2A3022]"
          >
            <div className="px-4 py-2 space-y-1 bg-[#131610]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    isActive(item.href)
                      ? "bg-lime-500/10 text-lime-300"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#1D2117]",
                  )}
                >
                  <span className={cn(item.icon, isActive(item.href) ? item.color : "text-gray-500")} />
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </header>
      )}


      {/* Main content */}
      <main className={isEditorRoute ? undefined : "pt-14"}>
        {children}
      </main>
    </div>
  );
}
