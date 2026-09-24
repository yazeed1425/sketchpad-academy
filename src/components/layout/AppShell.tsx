"use client";

import Link from "next/link";
import useSWR from "swr";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";
import { usePaths } from "@/lib/hooks/useGameData";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { XpBar } from "@/components/ui/XpBar";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  CompassIcon,
  FlameIcon,
  BadgeIcon,
  HomeIcon,
  MapIcon,
  FileTextIcon,
  BarChartIcon,
  ZapIcon,
  type IconProps,
} from "@/components/ui/icons";
import { HeartRegenTimer } from "@/components/dashboard/HeartRegenTimer";
import { apiFetcher, apiPost } from "@/lib/hooks/useApi";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber, type TranslationKey } from "@/lib/i18n/translations";

type NavItem = { href: string; key: TranslationKey; icon: (props: IconProps) => React.ReactElement };

const SIDEBAR_NAV: NavItem[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: HomeIcon },
  { href: "/roadmap", key: "nav.roadmap", icon: MapIcon },
  { href: "/dashboard", key: "nav.tests", icon: FileTextIcon },
  { href: "/dashboard", key: "nav.analytics", icon: BarChartIcon },
  { href: "/leagues", key: "nav.leagues", icon: BadgeIcon },
];

const TOP_NAV: NavItem[] = SIDEBAR_NAV.slice(0, 3);

export function AppShell({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const { paths } = usePaths();
  const { data: authData } = useSWR<{ user: { email: string } | null }>("/api/auth/me", apiFetcher);
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLocale();

  const enrolledPath = paths.find((p) => p.enrolled);
  const roadmapHref = enrolledPath ? `/paths/${enrolledPath.id}/tree` : "/diagnostic";
  const resolveHref = (item: NavItem) => (item.key === "nav.roadmap" ? roadmapHref : item.href);
  const isActive = (item: NavItem) => {
    if (item.key === "nav.roadmap") return pathname.startsWith("/paths/") && pathname.endsWith("/tree");
    if (item.key === "nav.dashboard") return pathname === "/dashboard";
    return false;
  };

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  const initial = profile.profile?.name?.trim().charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex-1 flex flex-col bg-[var(--paper)]">
      {/* Top nav bar */}
      <nav dir={locale === "ar" ? "rtl" : "ltr"} className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border-secondary)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-[var(--accent)] shrink-0">
            <span className="rounded-[var(--radius-md)] w-8 h-8 flex items-center justify-center bg-[var(--accent)] text-white">
              <CompassIcon size={18} />
            </span>
            <span className="hidden sm:inline font-display text-base text-[var(--ink)]">{t("app.name")}</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {TOP_NAV.map((item) => (
              <Link
                key={item.key}
                href={resolveHref(item)}
                className={`font-display text-sm px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors ${
                  isActive(item) ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold" : "text-[var(--ink-soft)] hover:bg-[var(--paper)]"
                }`}
              >
                <item.icon size={16} />
                {t(item.key)}
              </Link>
            ))}
          </div>

          {profile.profile && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: "var(--overdue-soft)", border: "1px solid var(--overdue-border)" }}>
                <FlameIcon size={14} className="streak-icon text-[var(--overdue)]" />
                <span className="font-display text-xs font-bold text-[var(--overdue)]">{formatNumber(profile.profile.currentStreak, locale)}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--brand-100)]">
                <ZapIcon size={13} className="text-[var(--accent)]" />
                <span className="font-display text-xs font-bold text-[var(--accent)]">{formatNumber(profile.profile.totalXp, locale)}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[var(--heart-soft)]">
                <HeartsRow hearts={profile.profile.hearts} max={profile.profile.heartsMax} size={14} />
                <HeartRegenTimer nextRegenAt={profile.profile.nextRegenAt} hearts={profile.profile.hearts} max={profile.profile.heartsMax} />
              </div>
              <Link
                href="/profile"
                className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-display text-sm shrink-0"
                title={t("nav.profile")}
              >
                {initial}
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar + floating content card */}
      <div className="flex-1 flex bg-[var(--paper)] p-0 sm:p-3 gap-0 sm:gap-3" dir="ltr">
        <div className="flex-1 flex flex-col min-w-0 order-1">
          <main dir={locale === "ar" ? "rtl" : "ltr"} className="floating-card flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>

        <aside
          dir={locale === "ar" ? "rtl" : "ltr"}
          className="order-2 w-16 sm:w-56 shrink-0 flex flex-col items-center sm:items-stretch gap-2 p-3 sm:p-4"
        >
          <nav className="flex flex-col gap-1 w-full">
            {SIDEBAR_NAV.map((item, i) => (
              <Link
                key={`${item.key}-${i}`}
                href={resolveHref(item)}
                title={t(item.key)}
                className={`font-display text-sm px-3 py-2 flex items-center justify-center sm:justify-start gap-2.5 transition-colors ${
                  isActive(item) ? "nav-item-active" : "nav-item-inactive"
                }`}
              >
                <item.icon size={18} />
                <span className="hidden sm:inline">{t(item.key)}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 items-center sm:items-stretch w-full">
            <div className="flex gap-2 justify-center sm:justify-start">
              <ThemeToggle />
              <LanguageToggle />
            </div>

            {profile.profile && (
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2.5 rounded-[var(--radius-xl)] border border-[var(--border-secondary)] shadow-[var(--shadow-sm)] bg-[var(--card-bg)] p-3"
              >
                <span className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-display text-sm shrink-0">
                  {initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--ink)] truncate">{profile.profile.name}</span>
                  {authData?.user?.email ? (
                    <span className="block text-xs text-[var(--ink-soft)] truncate">{authData.user.email}</span>
                  ) : (
                    <span className="block text-xs text-[var(--ink-soft)]">{t("dashboard.level", { level: profile.profile.level })}</span>
                  )}
                </span>
              </Link>
            )}

            {profile.profile && (
              <div className="hidden sm:flex items-center gap-2 px-1">
                <span className="text-[10px] font-display font-semibold text-[var(--info)] bg-[var(--info-soft)] rounded-full px-2 py-0.5 shrink-0">
                  {t("dashboard.level", { level: profile.profile.level })}
                </span>
                <XpBar value={profile.profile.xpIntoLevel} max={profile.profile.xpForNextLevel} height={8} />
              </div>
            )}

            <button onClick={handleLogout} className="text-sm text-[var(--ink-soft)] underline cursor-pointer text-center sm:text-left">
              <span className="sm:hidden">⎋</span>
              <span className="hidden sm:inline">{t("nav.signOut")}</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
