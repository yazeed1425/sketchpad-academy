"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { SkillIcon, StarIcon } from "@/components/ui/icons";
import { usePaths } from "@/lib/hooks/useGameData";
import { apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { pathColor } from "@/lib/pathColors";

export default function PathDetailPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = use(params);
  const { paths, isLoading, mutate } = usePaths();
  const [enrolling, setEnrolling] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const path = paths.find((p) => p.id === pathId);

  async function handleEnroll() {
    setEnrolling(true);
    try {
      await apiPost(`/api/paths/${pathId}/enroll`);
      await mutate();
      router.push(`/paths/${pathId}/tree`);
    } finally {
      setEnrolling(false);
    }
  }

  if (isLoading) return <p>{t("pathDetail.loading")}</p>;
  if (!path) return <p>{t("pathDetail.notFound")}</p>;

  const color = pathColor(path.id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <span className="shrink-0 rounded-2xl p-3" style={{ backgroundColor: color.soft, color: color.solid }}>
          <SkillIcon icon={path.icon} size={34} />
        </span>
        <div>
          <h1 className="font-display text-3xl">{path.title}</h1>
          <p className="text-[var(--ink-soft)] mt-1">{path.description}</p>
        </div>
      </div>

      <Card className="mb-6">
        <h2 className="font-display text-xl mb-3 flex items-center gap-2">
          <StarIcon size={18} /> {t("pathDetail.whatYoullMaster")}
        </h2>
        <ol className="space-y-3">
          {path.milestones.map((m, i) => (
            <li key={m.id} className="flex gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full border border-[var(--ink-soft)] flex items-center justify-center font-display text-sm">
                {i + 1}
              </span>
              <div>
                <p className="font-display text-lg leading-tight">{m.title}</p>
                <p className="text-sm text-[var(--ink-soft)]">{m.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {path.enrolled ? (
        <Link href={`/paths/${pathId}/tree`}>
          <RoughButton>{t("pathDetail.continuePath")}</RoughButton>
        </Link>
      ) : (
        <RoughButton onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? t("pathDetail.starting") : t("pathDetail.startPath")}
        </RoughButton>
      )}
    </div>
  );
}
