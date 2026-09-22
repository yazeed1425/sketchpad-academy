"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className={`text-sm border border-[var(--border-primary)] rounded-[var(--radius-md)] px-2 py-1.5 cursor-pointer bg-[var(--card-bg)] text-[var(--ink-soft)] hover:bg-[var(--paper)] transition-colors ${className}`}
    >
      {t("lang.toggle")}
    </button>
  );
}
