"use client";

import { useTheme } from "@/lib/theme/ThemeProvider";
import { SunIcon, MoonIcon } from "./icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle light/dark mode"
      className={`border border-[var(--border-primary)] rounded-[var(--radius-md)] w-9 h-9 flex items-center justify-center cursor-pointer bg-[var(--card-bg)] text-[var(--ink-soft)] hover:bg-[var(--paper)] transition-colors ${className}`}
    >
      {theme === "light" ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </button>
  );
}
