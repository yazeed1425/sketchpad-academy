"use client";

import { useTheme } from "@/lib/theme/ThemeProvider";
import { SunIcon, MoonIcon } from "./icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle light/dark mode"
      className={`border-2 border-[var(--ink)] rounded-lg p-1.5 cursor-pointer hover:bg-[var(--accent-soft)] transition-colors ${className}`}
    >
      {theme === "light" ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </button>
  );
}
