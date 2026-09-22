"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { AuthShell } from "@/components/layout/AuthShell";
import { apiPost, ApiError } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/api/auth/register", { name, email, password });
      router.push("/paths");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <Card>
        <h2 className="font-display text-2xl mb-4">{t("auth.startNotebook")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--ink-soft)] mb-1">{t("auth.name")}</label>
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--border-primary)] rounded-[var(--radius-md)] px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--ink-soft)] mb-1">{t("auth.email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[var(--border-primary)] rounded-[var(--radius-md)] px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--ink-soft)] mb-1">{t("auth.password")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[var(--border-primary)] rounded-[var(--radius-md)] px-3 py-2 bg-transparent focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-shadow"
            />
            <p className="text-xs text-[var(--ink-faint)] mt-1">{t("auth.passwordHint")}</p>
          </div>
          {error && <p className="text-sm text-[var(--heart)]">{error}</p>}
          <RoughButton type="submit" fullWidth disabled={loading}>
            {loading ? t("auth.creatingAccount") : t("auth.createAccountBtn")}
          </RoughButton>
        </form>
      </Card>
      <p className="text-center mt-4 text-sm text-[var(--ink-soft)]">
        {t("auth.alreadyHave")}{" "}
        <Link href="/login" className="text-[var(--accent)] underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
