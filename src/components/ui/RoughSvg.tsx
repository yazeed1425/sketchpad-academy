"use client";

import { useEffect, useRef, useState } from "react";
import rough from "roughjs";

/**
 * Renders a hand-drawn rectangle/border behind its children using rough.js,
 * redrawing whenever the box resizes. This is the base "sketchy card" shell
 * used across the app instead of plain CSS borders.
 */
export function RoughPanel({
  children,
  className = "",
  style,
  rounded = 14,
  fill,
  fillStyle = "solid",
  strokeWidth = 1.75,
  roughness = 1.6,
  seed,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  rounded?: number;
  fill?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  strokeWidth?: number;
  roughness?: number;
  seed?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentBoxSize?.[0];
      if (box) setSize({ width: box.inlineSize, height: box.blockSize });
      else setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.width === 0 || size.height === 0) return;
    svg.innerHTML = "";
    const rc = rough.svg(svg);
    const pad = strokeWidth;
    const w = size.width - pad * 2;
    const h = size.height - pad * 2;
    const node = rc.rectangle(pad, pad, w, h, {
      roughness,
      strokeWidth,
      stroke: "var(--line)",
      fill,
      fillStyle,
      seed,
    });
    // Rounded corners aren't native to rough's rectangle; approximate with a path when requested.
    if (rounded > 0) {
      const path = rc.path(roundedRectPath(pad, pad, w, h, rounded), {
        roughness,
        strokeWidth,
        stroke: "var(--line)",
        fill,
        fillStyle,
        seed,
      });
      svg.appendChild(path);
    } else {
      svg.appendChild(node);
    }
  }, [size, rounded, fill, fillStyle, strokeWidth, roughness, seed]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`} style={style}>
      <svg ref={svgRef} className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden />
      <div className="relative h-full w-full flex items-center justify-center">{children}</div>
    </div>
  );
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  return `M ${x + radius} ${y}
    L ${x + w - radius} ${y}
    Q ${x + w} ${y} ${x + w} ${y + radius}
    L ${x + w} ${y + h - radius}
    Q ${x + w} ${y + h} ${x + w - radius} ${y + h}
    L ${x + radius} ${y + h}
    Q ${x} ${y + h} ${x} ${y + h - radius}
    L ${x} ${y + radius}
    Q ${x} ${y} ${x + radius} ${y}
    Z`;
}
