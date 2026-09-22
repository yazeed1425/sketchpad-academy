"use client";

import { RoughPanel } from "./RoughSvg";

export function Card({
  children,
  className = "",
  padding = "p-5",
  seed,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  seed?: number;
}) {
  return (
    <RoughPanel className={className} fill="var(--card-bg)" fillStyle="solid" rounded={16} seed={seed}>
      <div className={padding}>{children}</div>
    </RoughPanel>
  );
}
