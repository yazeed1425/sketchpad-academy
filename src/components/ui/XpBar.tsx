"use client";

import { useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function XpBar({
  value,
  max,
  height = 22,
  className = "",
  fillColor = "var(--accent)",
}: {
  value: number;
  max: number;
  height?: number;
  className?: string;
  fillColor?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;
    svg.innerHTML = "";
    const rc = rough.svg(svg);
    const pad = 2;
    const trackWidth = width - pad * 2;
    const trackHeight = height - pad * 2;

    svg.appendChild(
      rc.rectangle(pad, pad, trackWidth, trackHeight, {
        roughness: 1.4,
        strokeWidth: 1.8,
        stroke: "var(--line)",
        fill: "transparent",
      })
    );

    const fillWidth = Math.max(6, trackWidth * pct);
    if (pct > 0) {
      const fillX = isRtl ? pad + trackWidth - fillWidth : pad;
      svg.appendChild(
        rc.rectangle(fillX, pad, fillWidth, trackHeight, {
          roughness: 1.6,
          strokeWidth: 0,
          fill: fillColor,
          fillStyle: "solid",
        })
      );
    }
  }, [width, pct, height, fillColor, isRtl]);

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`} style={{ height }}>
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
