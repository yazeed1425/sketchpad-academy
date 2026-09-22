import type { Metadata } from "next";
import { Poppins, Inter, Cairo } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { DEFAULT_THEME, THEME_COOKIE, type Theme } from "@/lib/theme/ThemeProvider";

const displayFont = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const arabicFont = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sketchpad Academy",
  description: "A hand-drawn, gamified learning platform for high schoolers.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined) ?? DEFAULT_LOCALE;
  const theme = (cookieStore.get(THEME_COOKIE)?.value as Theme | undefined) ?? DEFAULT_THEME;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-theme={theme}
      className={`${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col paper-bg">
        {/* Shared SVG filter that gives borders, icons, and strokes a hand-inked wobble. */}
        <svg aria-hidden className="sketch-defs">
          <filter id="ink-wobble" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="ink-wobble-sm" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06 0.12" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <ThemeProvider initialTheme={theme}>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
