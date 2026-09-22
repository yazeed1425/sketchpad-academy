"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export function HeartRegenTimer({ nextRegenAt, hearts, max }: { nextRegenAt: string | null; hearts: number; max: number }) {
  const [now, setNow] = useState(() => Date.now());
  const { t } = useTranslation();

  useEffect(() => {
    if (!nextRegenAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextRegenAt]);

  if (hearts >= max || !nextRegenAt) return <span className="text-[10px] text-[var(--ink-faint)]">{t("nav.full")}</span>;

  const remainingMs = Math.max(0, new Date(nextRegenAt).getTime() - now);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const time = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return <span className="text-[10px] text-[var(--ink-faint)]">{t("nav.nextIn", { time })}</span>;
}
