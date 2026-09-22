"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { apiPost, ApiError } from "@/lib/hooks/useApi";
import { CompassIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-end gap-2 mb-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <div className="flex items-center gap-2 justify-center mb-6 text-[var(--accent)]">
          <CompassIcon size={32} />
          <h1 className="font-display text-3xl text-[var(--ink)]">{t("app.name")}</h1>
        </div>
        <Card>
          <h2 className="font-display text-2xl mb-4">{t("auth.welcomeBack")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--ink-soft)] mb-1">{t("auth.email")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[var(--ink-soft)] rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--ink-soft)] mb-1">{t("auth.password")}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[var(--ink-soft)] rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            {error && <p className="text-sm text-[var(--heart)]">{error}</p>}
            <RoughButton type="submit" fullWidth disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </RoughButton>
          </form>
        </Card>
        <p className="text-center mt-4 text-sm text-[var(--ink-soft)]">
          {t("auth.newHere")}{" "}
          <Link href="/register" className="text-[var(--accent)] underline">
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </main>
  );
}
