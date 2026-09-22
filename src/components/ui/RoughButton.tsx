"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--accent)] border-[var(--accent)] text-white hover:brightness-105 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
  secondary: "bg-[var(--card-bg)] border-[var(--ink-soft)] text-[var(--ink)] hover:bg-[var(--ink-faint)]/10",
  ghost: "bg-transparent border-transparent text-[var(--ink)] hover:bg-[var(--ink-faint)]/10",
  danger: "bg-[var(--heart)] border-[var(--heart)] text-white hover:brightness-105 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
  success: "bg-[var(--success)] border-[var(--success)] text-white hover:brightness-105 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
};

interface RoughButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function RoughButton({ variant = "primary", fullWidth, className = "", children, disabled, ...rest }: RoughButtonProps) {
  return (
    <button
      className={`font-display text-base px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
        fullWidth ? "w-full" : ""
      } ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
