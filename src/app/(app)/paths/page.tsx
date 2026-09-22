"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SkillIcon } from "@/components/ui/icons";
import { usePaths } from "@/lib/hooks/useGameData";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { pathColor } from "@/lib/pathColors";

export default function PathsPage() {
  const { paths, isLoading } = usePaths();
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">{t("paths.title")}</h1>
      <p className="text-[var(--ink-soft)] mb-6">{t("paths.subtitle")}</p>

      {isLoading ? (
        <p>{t("paths.loading")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {paths.map((path) => {
            const color = pathColor(path.id);
            return (
              <Link key={path.id} href={`/paths/${path.id}`}>
                <Card className="h-full hover:-translate-y-1 hover:shadow-[var(--shadow-md)] transition-all overflow-hidden relative">
                  <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: color.solid }} aria-hidden />
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 rounded-xl p-2.5" style={{ backgroundColor: color.soft, color: color.solid }}>
                      <SkillIcon icon={path.icon} size={26} />
                    </span>
                    <div>
                      <h2 className="font-display text-xl">{path.title}</h2>
                      <p className="text-sm text-[var(--ink-soft)] mt-1">{path.description}</p>
                      <p className="text-xs text-[var(--ink-faint)] mt-2">
                        {path.enrolled
                          ? t("dashboard.skillsComplete", { done: path.completedCount, total: path.skillCount })
                          : t("paths.skills", { count: path.skillCount })}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
