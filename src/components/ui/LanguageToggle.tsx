"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className={`text-sm border border-[var(--ink-soft)] rounded-lg px-2 py-1 cursor-pointer hover:bg-[var(--accent-soft)] transition-colors ${className}`}
    >
      {t("lang.toggle")}
    </button>
  );
}
