"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { XpBar } from "@/components/ui/XpBar";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CompassIcon, FlameIcon, LightbulbIcon, BadgeIcon, ThumbUpIcon, type IconProps } from "@/components/ui/icons";
import { HeartRegenTimer } from "@/components/dashboard/HeartRegenTimer";
import { apiPost } from "@/lib/hooks/useApi";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

const NAV: { href: string; key: TranslationKey; icon: (props: IconProps) => React.ReactElement }[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: CompassIcon },
  { href: "/paths", key: "nav.paths", icon: LightbulbIcon },
  { href: "/leagues", key: "nav.leagues", icon: BadgeIcon },
  { href: "/profile", key: "nav.profile", icon: ThumbUpIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLocale();

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    // The sidebar stays pinned to the physical right in both languages (per request),
    // so the shell chrome is forced LTR here; page content below gets its own dir per locale.
    <div className="flex-1 flex" dir="ltr">
      <div className="flex-1 flex flex-col min-w-0 order-1">
        {profile.profile && (
          <header className="bg-[var(--card-bg)]">
            <div
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4"
            >
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="border border-[var(--ink-soft)] rounded-full w-9 h-9 flex items-center justify-center font-display text-sm bg-[var(--info-soft)] text-[var(--info)]"
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
            </div>
          </header>
        )}

        <main dir={locale === "ar" ? "rtl" : "ltr"} className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          {children}
        </main>
      </div>

      <aside
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="order-2 w-16 sm:w-56 shrink-0 border-l border-[var(--ink-faint)] bg-[var(--card-bg)] flex flex-col items-center sm:items-stretch gap-6 p-3 sm:p-4"
      >
        <Link href="/dashboard" className="flex items-center gap-2 text-[var(--accent)] justify-center sm:justify-start">
          <CompassIcon size={28} />
          <span className="hidden sm:inline font-display text-lg text-[var(--ink)]">{t("app.name")}</span>
        </Link>

        <nav className="flex flex-col gap-1 w-full">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.key)}
                className={`font-display text-base px-3 py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 border-2 transition-colors ${
                  active
                    ? "border-[var(--ink)] bg-[var(--info-soft)] text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-soft)] hover:border-[var(--ink)]"
                }`}
              >
                <Icon size={22} />
                <span className="hidden sm:inline">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 items-center sm:items-stretch w-full">
          <div className="flex gap-2 justify-center sm:justify-start">
            <ThemeToggle />
            <LanguageToggle />
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--ink-soft)] underline cursor-pointer text-center sm:text-left"
          >
            <span className="sm:hidden">⎋</span>
            <span className="hidden sm:inline">{t("nav.signOut")}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
