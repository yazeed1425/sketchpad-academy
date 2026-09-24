"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden hero-gradient">
      <div
        className="pointer-events-none absolute -top-24 -end-24 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -start-24 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--success)" }}
        aria-hidden
      />
      <div className="w-full max-w-sm relative">
        <div className="flex justify-end gap-2 mb-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={t("app.name")} className="h-28 w-auto" />
        </div>
        {children}
      </div>
    </main>
  );
}
