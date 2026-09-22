"use client";

import type { ButtonHTMLAttributes } from "react";
import { RoughPanel } from "./RoughSvg";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_FILL: Record<Variant, string | undefined> = {
  primary: "var(--accent)",
  secondary: undefined,
  ghost: undefined,
  danger: "var(--heart)",
  success: "var(--success)",
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-[var(--ink)]",
  ghost: "text-[var(--ink)]",
  danger: "text-white",
  success: "text-white",
};

interface RoughButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function RoughButton({ variant = "primary", fullWidth, className = "", children, disabled, ...rest }: RoughButtonProps) {
  return (
    <RoughPanel
      className={`inline-block ${fullWidth ? "w-full" : ""} ${disabled ? "opacity-50" : "transition-transform active:scale-95 hover:-rotate-1"}`}
      fill={VARIANT_FILL[variant]}
      fillStyle="solid"
      rounded={12}
      strokeWidth={2}
    >
      <button
        className={`font-display text-lg px-5 py-2.5 w-full cursor-pointer disabled:cursor-not-allowed ${VARIANT_TEXT[variant]} ${className}`}
        disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    </RoughPanel>
  );
}
