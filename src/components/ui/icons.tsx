"use client";

// Simple stroke-based line icon set.

export interface IconProps {
  className?: string;
  size?: number;
  filled?: boolean;
}

function base(size: number) {
  return { width: size, height: size, viewBox: "0 0 24 24" };
}

export function HeartIcon({ className = "", size = 22, filled = true }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 20.2c-.3 0-.6-.1-.8-.3-2-1.8-3.9-3.5-5.3-5.2C4.2 12.9 3 11 3 8.8 3 6.2 5 4.2 7.5 4.2c1.5 0 2.9.8 3.7 2 .2.3.7.3.9 0 .8-1.2 2.2-2 3.7-2C18.3 4.2 21 6.2 21 8.8c0 2.2-1.2 4.1-2.9 5.9-1.4 1.7-3.3 3.4-5.3 5.2-.2.2-.5.3-.8.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.12 : 0}
      />
    </svg>
  );
}

export function HeartBrokenIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 20.2c-.3 0-.6-.1-.8-.3-2-1.8-3.9-3.5-5.3-5.2C4.2 12.9 3 11 3 8.8 3 6.2 5 4.2 7.5 4.2c1.5 0 2.9.8 3.7 2 .2.3.7.3.9 0 .8-1.2 2.2-2 3.7-2C18.3 4.2 21 6.2 21 8.8c0 2.2-1.2 4.1-2.9 5.9-1.4 1.7-3.3 3.4-5.3 5.2-.2.2-.5.3-.8.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
        strokeLinejoin="round"
        opacity={0.55}
      />
    </svg>
  );
}

export function LightbulbIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 18h6M9.5 21h5M12 3a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7v.3h6v-.3c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V7.8a4 4 0 1 1 8 0v2.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function ThumbUpIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5V12.5A1.5 1.5 0 0 1 4.5 11H7Zm0 0 3.6-6.4c.3-.6.9-.9 1.6-.8.9.2 1.5 1 1.4 1.9l-.6 4.3H18a2 2 0 0 1 2 2.3l-1.1 6.5a2 2 0 0 1-2 1.7H10a3 3 0 0 1-3-3V11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarIcon({ className = "", size = 22, filled = true }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m12 3.5 2.5 5.4 5.8.7-4.3 4 1.2 5.8L12 16.6l-5.2 2.8 1.2-5.8-4.3-4 5.8-.7L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.18 : 0}
      />
    </svg>
  );
}

export function BadgeIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m12 2.5 2.1 1.6 2.6-.4 1 2.4 2.3 1.2-.4 2.6 1.6 2.1-1.6 2.1.4 2.6-2.3 1.2-1 2.4-2.6-.4L12 21.5l-2.1-1.6-2.6.4-1-2.4-2.3-1.2.4-2.6L2.8 12l1.6-2.1-.4-2.6 2.3-1.2 1-2.4 2.6.4L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function FlameIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 21.5c-4 0-6.5-2.6-6.5-6 0-2.5 1.4-4 2.4-5.6.3-.5 1-.4 1.1.2.2 1 .7 1.9 1.3 2.3-.2-2.8.7-5.8 3-7.9.4-.4 1-.1 1 .4-.1 1.7.3 3 1.2 4.2 1.2 1.6 2.5 3.3 2.5 6.4 0 3.4-2.5 6-6 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.15}
      />
    </svg>
  );
}

export function SunIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4.3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.7 6.7 0 0 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.12}
      />
    </svg>
  );
}

export function BookIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 6.2c-1.4-1.1-3.4-1.7-5.5-1.7-.6 0-1 .4-1 1v11c0 .6.4 1 1 1 2 0 3.9.6 5.2 1.6.2.1.4.2.6.2M12 6.2c1.4-1.1 3.4-1.7 5.5-1.7.6 0 1 .4 1 1v11c0 .6-.4 1-1 1-2 0-3.9.6-5.2 1.6-.2.1-.4.2-.6.2m0-12.7v12.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TargetIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function CompassIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m14.5 9.5-1.7 5-5 1.7 1.7-5 5-1.7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon({ className = "", size = 22 }: IconProps) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {teeth.map((angle) => (
        <rect key={angle} x="10.9" y="1.8" width="2.2" height="3.4" rx="0.7" fill="currentColor" transform={`rotate(${angle} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="5.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function NotesIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 4h8.5L18 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14.5 4v3.5H18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.5 10.5h6M7.5 13.3h6M7.5 16.1h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function CalculatorIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7.2" y="5.5" width="9.6" height="3.6" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8.5" cy="13.2" r="0.95" fill="currentColor" />
      <circle cx="12" cy="13.2" r="0.95" fill="currentColor" />
      <circle cx="15.5" cy="13.2" r="0.95" fill="currentColor" />
      <circle cx="8.5" cy="17" r="0.95" fill="currentColor" />
      <circle cx="12" cy="17" r="0.95" fill="currentColor" />
      <circle cx="15.5" cy="17" r="0.95" fill="currentColor" />
    </svg>
  );
}

export function TrophyIcon({ className = "", size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 5.5H5.7a2 2 0 0 0 0 4H8M16 5.5h2.3a2 2 0 0 1 0 4H16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M8 4.5h8v5a4 4 0 0 1-8 0v-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 13.5v2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M9.7 19.5h4.6a1 1 0 0 0 1-1v-1.7h-6.6V18.5a1 1 0 0 0 1 1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="m12 6.6.7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.8-1.4.8.3-1.5-1.1-1.1 1.5-.2.7-1.4Z"
        fill="currentColor"
        fillOpacity={0.9}
      />
    </svg>
  );
}

export function CheckIcon({ className = "", size = 26 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 12.8 9 17.5l10.5-11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ className = "", size = 26 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6.5 18 18M18 6.5 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MapIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 4.5 4.5 6v13L9 17.5m0-13 6 2m-6-2v13m6-11 4.5-1.5v13L15 19.5m0-13v13m0-13-6 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileTextIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h8.5L18 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14.5 4v3.5H18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 11h8M8 14h8M8 17h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function BarChartIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ActivityIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12h4l2.2-6.5L13 18l2-8 1.5 2.5H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 16.5 9.5 10l4 4L21 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 6.5H21v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ZapIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity={0.15} />
    </svg>
  );
}

export function HashIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.5 3.5 7 20.5M17 3.5l-2.5 17M4 8.5h16M3 15.5h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayCircleIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 8.5 15.5 12 10 15.5V8.5Z" fill="currentColor" />
    </svg>
  );
}

export function CircleIcon({ className = "", size = 8, filled = true }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  heart: HeartIcon,
  lightbulb: LightbulbIcon,
  lock: LockIcon,
  thumb: ThumbUpIcon,
  star: StarIcon,
  badge: BadgeIcon,
  flame: FlameIcon,
  compass: CompassIcon,
  book: BookIcon,
  gear: GearIcon,
  notes: NotesIcon,
  calculator: CalculatorIcon,
  trophy: TrophyIcon,
  // Aliases for the topic-icon vocabulary used by skill-tree nodes (see topicIcons.tsx),
  // so path catalog cards (which still use this simpler dispatcher) render sensibly too.
  bulb: LightbulbIcon,
  books: BookIcon,
  search: TargetIcon,
  chart: BadgeIcon,
};

export function SkillIcon({ icon, ...props }: IconProps & { icon: string }) {
  const Cmp = ICONS[icon] ?? LightbulbIcon;
  return <Cmp {...props} />;
}
