"use client";

// Full-color "sticker" style topic badges for skill-tree nodes — each badge is a
// fixed pastel circle + a multi-tone icon (unlike the rest of the icon set, these
// are not currentColor-tintable; they're meant to look identical in light/dark).

export type TopicIconKey = "books" | "bulb" | "search" | "calculator" | "chart";

function Sparkle({ x, y, fill = "#FFFFFF", opacity = 0.85 }: { x: number; y: number; fill?: string; opacity?: number }) {
  return (
    <path
      d={`M${x} ${y - 2.6}l0.7 1.9 1.9 0.7-1.9 0.7-0.7 1.9-0.7-1.9-1.9-0.7 1.9-0.7Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

function PadlockArt() {
  return (
    <>
      <path d="M13 16v-4a5 5 0 0 1 10 0v4" stroke="#8B93A1" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="10" y="16" width="16" height="14" rx="3" fill="#A8AEB8" />
      <rect x="10" y="16" width="16" height="6.5" rx="3" fill="#CBD1D8" />
      <circle cx="18" cy="22" r="2" fill="#5B6472" />
      <rect x="17.1" y="22" width="1.8" height="4.2" rx="0.9" fill="#5B6472" />
      <Sparkle x={28} y={7} />
    </>
  );
}

function ChecklistPencilArt() {
  return (
    <>
      <rect x="9" y="6" width="16" height="24" rx="2.5" fill="#FFFFFF" />
      <rect x="13" y="4" width="8" height="4" rx="1.5" fill="#94A3B8" />
      <g stroke="#34D399" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12 13.3l1.3 1.3 2.5-2.7" />
        <path d="M12 18.8l1.3 1.3 2.5-2.7" />
        <path d="M12 24.3l1.3 1.3 2.5-2.7" />
      </g>
      <line x1="18" y1="12.8" x2="22.3" y2="12.8" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="18" y1="18.3" x2="22.3" y2="18.3" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="18" y1="23.8" x2="22.3" y2="23.8" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" />
      <g transform="rotate(45 26 22)">
        <rect x="24.3" y="9" width="3.4" height="15" rx="1" fill="#FBBF24" />
        <rect x="24.3" y="9" width="3.4" height="3" fill="#F472B6" />
        <path d="M24.3 24l1.7 2.6 1.7-2.6Z" fill="#334155" />
      </g>
    </>
  );
}

function BooksArt() {
  return (
    <>
      <g transform="rotate(-6 18 23)">
        <rect x="8" y="21" width="20" height="5" rx="1" fill="#FDE68A" />
      </g>
      <g transform="rotate(3 18 17)">
        <rect x="7" y="14" width="20" height="6" rx="1" fill="#60A5FA" />
      </g>
      <g transform="rotate(-3 17 9)">
        <rect x="8" y="6" width="19" height="6.5" rx="1" fill="#A78BFA" />
        <rect x="8" y="6" width="19" height="2" rx="1" fill="#C4B5FD" />
      </g>
      <Sparkle x={28} y={6} />
      <Sparkle x={7} y={28} fill="#FFFFFF" opacity={0.7} />
    </>
  );
}

function BulbArt() {
  return (
    <>
      <g stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round">
        <line x1="18" y1="3" x2="18" y2="6" />
        <line x1="7.3" y1="9.3" x2="9.5" y2="11.2" />
        <line x1="28.7" y1="9.3" x2="26.5" y2="11.2" />
        <line x1="5.5" y1="18" x2="8.5" y2="18" />
        <line x1="30.5" y1="18" x2="27.5" y2="18" />
      </g>
      <path
        d="M18 8a8 8 0 0 0-4.8 14.4c.6.5 1 1.2 1 2v1.1h7.6v-1.1c0-.8.4-1.5 1-2A8 8 0 0 0 18 8Z"
        fill="#FEF3C7"
      />
      <path
        d="M15.3 13.8l1.6 1.9-1.3 1.4 1.9 2.1"
        stroke="#F59E0B"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="14.2" y1="26" x2="21.8" y2="26" stroke="#F1F5F9" strokeWidth="1.6" />
      <rect x="14.5" y="27.3" width="7" height="2.2" rx="1" fill="#94A3B8" />
      <rect x="14.5" y="29.8" width="7" height="1.8" rx="0.9" fill="#64748B" />
    </>
  );
}

function SearchArt() {
  return (
    <>
      <path d="M9 5h11l5 5v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="#FFFFFF" />
      <path d="M20 5v5h5Z" fill="#DBEAFE" />
      <line x1="10.5" y1="14.5" x2="19" y2="14.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="10.5" y1="18.5" x2="19" y2="18.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="10.5" y1="22.5" x2="16" y2="22.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23.2" cy="24.2" r="5" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2" />
      <line x1="26.8" y1="27.8" x2="30.3" y2="31.3" stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function CalculatorArt() {
  return (
    <>
      <rect x="9" y="5" width="18" height="26" rx="3" fill="#334155" />
      <rect x="11.5" y="8" width="13" height="6" rx="1.2" fill="#F9A8D4" />
      <g fill="#F1F5F9">
        <circle cx="13.5" cy="19" r="1.6" />
        <circle cx="18" cy="19" r="1.6" />
        <circle cx="22.5" cy="19" r="1.6" />
        <circle cx="13.5" cy="24" r="1.6" />
        <circle cx="18" cy="24" r="1.6" />
        <circle cx="22.5" cy="24" r="1.6" />
      </g>
      <g fill="#F472B6">
        <circle cx="13.5" cy="28.3" r="1.6" />
        <circle cx="18" cy="28.3" r="1.6" />
        <circle cx="22.5" cy="28.3" r="1.6" />
      </g>
    </>
  );
}

function ChartArt() {
  return (
    <>
      <rect x="6" y="8" width="24" height="20" rx="2.5" fill="#FFFFFF" />
      <path d="M6 10.5A2.5 2.5 0 0 1 8.5 8h19A2.5 2.5 0 0 1 30 10.5V13H6Z" fill="#FED7AA" />
      <circle cx="9.5" cy="10.5" r="0.9" fill="#F97316" />
      <circle cx="12.2" cy="10.5" r="0.9" fill="#FB923C" />
      <circle cx="14.9" cy="10.5" r="0.9" fill="#FDBA74" />
      <g fill="#1E293B">
        <rect x="10" y="20" width="3" height="6" rx="1" />
        <rect x="14.5" y="16" width="3" height="10" rx="1" />
        <rect x="19" y="22" width="3" height="4" rx="1" />
        <rect x="23.5" y="18" width="3" height="8" rx="1" />
      </g>
      <Sparkle x={29} y={6} />
    </>
  );
}

export const TOPIC_BADGE_KEYS: TopicIconKey[] = ["books", "bulb", "search", "calculator", "chart"];

const TOPIC_BADGE: Record<TopicIconKey, { bg: string; Art: () => React.ReactElement }> = {
  books: { bg: "#DCCFF6", Art: BooksArt },
  bulb: { bg: "#FFE49A", Art: BulbArt },
  search: { bg: "#C7E2FB", Art: SearchArt },
  calculator: { bg: "#FBD1E1", Art: CalculatorArt },
  chart: { bg: "#FFD9AE", Art: ChartArt },
};

const LOCKED_BADGE = { bg: "#E3E3E6", Art: PadlockArt };
const COMPLETED_BADGE = { bg: "#A7F0C4", Art: ChecklistPencilArt };

export interface SkillBadgeProps {
  icon: string;
  status: "LOCKED" | "UNLOCKED" | "IN_PROGRESS" | "COMPLETED";
  size?: number;
  className?: string;
}

/** Renders the right badge (locked padlock, completed checklist, or the skill's topic icon) for a skill-tree node. */
export function SkillBadge({ icon, status, size = 64, className = "" }: SkillBadgeProps) {
  const badge =
    status === "LOCKED" ? LOCKED_BADGE : status === "COMPLETED" ? COMPLETED_BADGE : TOPIC_BADGE[icon as TopicIconKey] ?? TOPIC_BADGE.bulb;
  const { bg, Art } = badge;

  return (
    <div
      className={`rounded-full flex items-center justify-center ${status === "LOCKED" ? "opacity-60" : ""} ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <Art />
      </svg>
    </div>
  );
}
