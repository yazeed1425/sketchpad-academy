"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--accent)] border-[var(--accent)] text-white hover:brightness-95",
  secondary: "bg-[var(--card-bg)] border-[var(--ink)] text-[var(--ink)] hover:bg-black/5",
  ghost: "bg-transparent border-transparent text-[var(--ink)] hover:bg-black/5",
  danger: "bg-[var(--heart)] border-[var(--heart)] text-white hover:brightness-95",
  success: "bg-[var(--success)] border-[var(--success)] text-white hover:brightness-95",
};

interface RoughButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function RoughButton({ variant = "primary", fullWidth, className = "", children, disabled, ...rest }: RoughButtonProps) {
  return (
    <button
      className={`font-display text-base px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        fullWidth ? "w-full" : ""
      } ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
