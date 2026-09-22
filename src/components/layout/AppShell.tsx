"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { XpBar } from "@/components/ui/XpBar";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CompassIcon, FlameIcon } from "@/components/ui/icons";
import { HeartRegenTimer } from "@/components/dashboard/HeartRegenTimer";
import { apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/paths", key: "nav.paths" },
  { href: "/leagues", key: "nav.leagues" },
  { href: "/profile", key: "nav.profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b-2 border-[var(--ink)] bg-[var(--card-bg)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-[var(--accent)] shrink-0">
            <CompassIcon size={28} />
            <span className="font-display text-xl text-[var(--ink)]">{t("app.name")}</span>
          </Link>

          {profile.profile && (
            <>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="ink-wobble-sm border-2 border-[var(--ink)] rounded-full w-9 h-9 flex items-center justify-center font-display text-sm bg-[var(--info-soft)] text-[var(--info)]"
                  title={t("dashboard.level", { level: profile.profile.level })}
                >
                  {profile.profile.level}
                </div>
                <div className="w-28 sm:w-40">
                  <XpBar value={profile.profile.xpIntoLevel} max={profile.profile.xpForNextLevel} height={16} />
                </div>
              </div>

              <div className="flex items-center gap-1 text-[var(--gold)] shrink-0">
                <FlameIcon size={20} />
                <span className="font-display text-lg text-[var(--ink)]">{profile.profile.currentStreak}</span>
              </div>

              <div className="flex flex-col items-start shrink-0">
                <HeartsRow hearts={profile.profile.hearts} max={profile.profile.heartsMax} size={18} />
                <HeartRegenTimer nextRegenAt={profile.profile.nextRegenAt} hearts={profile.profile.hearts} max={profile.profile.heartsMax} />
              </div>
            </>
          )}

          <div className="ms-auto flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <LanguageToggle />
            <button onClick={handleLogout} className="text-sm text-[var(--ink-soft)] underline cursor-pointer">
              {t("nav.signOut")}
            </button>
          </div>
        </div>

        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-display text-base px-3 py-1.5 rounded-lg whitespace-nowrap border-2 transition-colors ${
                  active
                    ? "border-[var(--ink)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-soft)] hover:border-[var(--ink)]"
                }`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
