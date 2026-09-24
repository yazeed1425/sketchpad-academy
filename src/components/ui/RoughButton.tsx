"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--accent)] border-transparent text-white hover:bg-[var(--brand-700)] shadow-[var(--shadow-sm)]",
  secondary: "bg-[var(--card-bg)] border-[var(--border-primary)] text-[var(--ink-soft)] hover:bg-[var(--paper)] shadow-[var(--shadow-sm)]",
  ghost: "bg-transparent border-transparent text-[var(--ink)] hover:bg-[var(--paper)]",
  danger: "bg-[var(--heart)] border-transparent text-white hover:brightness-105 shadow-[var(--shadow-sm)]",
  success: "bg-[var(--success)] border-transparent text-white hover:brightness-105 shadow-[var(--shadow-sm)]",
};

interface RoughButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function RoughButton({ variant = "primary", fullWidth, className = "", children, disabled, ...rest }: RoughButtonProps) {
  return (
    <button
      className={`font-display font-semibold text-base px-5 py-2.5 rounded-full border cursor-pointer transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        fullWidth ? "w-full" : ""
      } ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
