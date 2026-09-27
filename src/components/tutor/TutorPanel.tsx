"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import useSWR, { preload } from "swr";
import { RoughButton } from "@/components/ui/RoughButton";
import { MathText } from "@/components/ui/MathText";
import { ChatBubbleIcon, CardsIcon, NetworkIcon, CrossIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { apiFetcher, apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

interface ChatMessage {
  role: "user" | "tutor";
  text: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface GraphNode {
  id: string;
  label: string;
  description: string;
}

interface GraphEdge {
  from: string;
  to: string;
  relationship: string;
}

type Tab = "chat" | "flashcards" | "graph";

const flashcardsKey = (lessonId: string) => `/api/lessons/${lessonId}/tutor/flashcards`;
const knowledgeGraphKey = (lessonId: string) => `/api/lessons/${lessonId}/tutor/knowledge-graph`;

/** A soft-colored circular icon chip, the same pattern dashboard metric cards use, so tutor UI
 * reads as part of the app rather than a bolted-on generic widget. */
function IconChip({ icon, size = 36, tone = "accent" }: { icon: React.ReactNode; size?: number; tone?: "accent" | "paper" }) {
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: tone === "accent" ? "var(--accent-soft)" : "var(--paper)",
        color: tone === "accent" ? "var(--accent)" : "var(--ink-faint)",
      }}
    >
      {icon}
    </span>
  );
}

function EmptyState({ icon, text, suggestions, onPick }: { icon: React.ReactNode; text: string; suggestions?: string[]; onPick?: (s: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3 animate-pop-in">
      <IconChip icon={icon} size={52} />
      <p className="text-sm text-[var(--ink-faint)] max-w-[240px]">{text}</p>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-2 w-full max-w-[260px] mt-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onPick?.(s)}
              className="w-full text-center text-sm font-medium rounded-full px-3 py-2 border transition-colors cursor-pointer"
              style={{ background: "var(--accent-soft)", borderColor: "var(--brand-300)", color: "var(--brand-700)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
        active ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** lessonId present → grounded in that lesson's content; absent → grounded in the student's
 * overall learning plan/progress (see askPlanTutorQuestion), so the panel is always useful even
 * outside a lesson page. Exported for the lesson page's own 3-column studio layout, which embeds
 * this directly as its right-hand column instead of going through the tabbed TutorPanelBody. */
export function ChatTab({ lessonId }: { lessonId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(overrideQuestion?: string) {
    const question = (overrideQuestion ?? input).trim();
    if (!question || sending) return;
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const endpoint = lessonId ? `/api/lessons/${lessonId}/tutor/chat` : "/api/tutor/chat";
      const { answer } = await apiPost<{ answer: string }>(endpoint, { question, history: messages });
      setMessages([...nextMessages, { role: "tutor", text: answer }]);
    } catch {
      setMessages([...nextMessages, { role: "tutor", text: "..." }]);
    } finally {
      setSending(false);
    }
  }

  const suggestionKeys: TranslationKey[] = lessonId
    ? ["tutor.suggestLessonExplain", "tutor.suggestLessonExample"]
    : ["tutor.suggestPlanFocus", "tutor.suggestPlanSummary"];

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 && (
          <EmptyState
            icon={<ChatBubbleIcon size={24} />}
            text={t(lessonId ? "tutor.chatEmpty" : "tutor.chatEmptyPlan")}
            suggestions={suggestionKeys.map((k) => t(k))}
            onPick={send}
          />
        )}
        {/* Own/incoming sidedness (own=right) is a chat convention independent of reading
            direction — WhatsApp/Telegram keep it in RTL Arabic too — so this uses physical
            ml-auto/mr-auto rather than justify-end/start, which would flip with dir="rtl". */}
        {messages.map((m, i) => (
          <div key={i} className="flex">
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "ml-auto" : "mr-auto"} ${
                m.role === "user" ? "bg-[var(--accent)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--border-secondary)]"
              }`}
            >
              <MathText text={m.text} />
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex">
            <div className="mr-auto bg-[var(--paper)] border border-[var(--border-secondary)] rounded-2xl px-3.5 py-2.5 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-faint)] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-faint)] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-faint)] animate-bounce" />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border-secondary)] pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("tutor.chatPlaceholder")}
          disabled={sending}
          className="flex-1 border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm bg-transparent focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-shadow"
        />
        <RoughButton onClick={() => send()} disabled={!input.trim() || sending} className="!px-4 !py-2 !text-sm">
          {t("tutor.chatSend")}
        </RoughButton>
      </div>
    </div>
  );
}

function FlashcardsTab({ lessonId }: { lessonId?: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useSWR<{ cards: Flashcard[] }>(lessonId ? flashcardsKey(lessonId) : null, apiFetcher, {
    revalidateOnFocus: false,
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!lessonId) return <EmptyState icon={<CardsIcon size={24} />} text={t("tutor.flashcardsNoLesson")} />;

  const cards = data?.cards ?? [];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
  }

  if (isLoading) return <EmptyState icon={<CardsIcon size={24} />} text={t("tutor.flashcardsLoading")} />;
  if (cards.length === 0) return <EmptyState icon={<CardsIcon size={24} />} text={t("tutor.flashcardsEmpty")} />;

  const card = cards[index];

  return (
    <div className="flex flex-col h-full items-center">
      <span className="badge-brand mb-3">{t("tutor.flashcardProgress", { current: index + 1, total: cards.length })}</span>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full flex-1 min-h-[220px] rounded-[var(--radius-2xl)] border-2 border-[var(--border-secondary)] bg-[var(--paper)] flex items-center justify-center p-6 text-center hover:border-[var(--accent)] transition-colors cursor-pointer"
      >
        <div>
          <p className="text-base font-display leading-relaxed">
            <MathText text={flipped ? card.back : card.front} />
          </p>
          <p className="text-[10px] text-[var(--ink-faint)] mt-4">{t("tutor.flashcardTapToFlip")}</p>
        </div>
      </button>
      <div className="flex items-center justify-between w-full mt-4 gap-3">
        <RoughButton variant="secondary" onClick={() => go(-1)} disabled={index === 0} className="!text-sm">
          {t("tutor.flashcardPrev")}
        </RoughButton>
        <RoughButton onClick={() => go(1)} disabled={index === cards.length - 1} className="!text-sm">
          {t("tutor.flashcardNext")}
        </RoughButton>
      </div>
    </div>
  );
}

const GRAPH_COLORS = ["var(--accent)", "var(--info)", "var(--success)", "var(--gold)", "var(--heart)", "var(--overdue)"];

function GraphTab({ lessonId }: { lessonId?: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useSWR<{ nodes: GraphNode[]; edges: GraphEdge[] }>(lessonId ? knowledgeGraphKey(lessonId) : null, apiFetcher, {
    revalidateOnFocus: false,
  });
  const [selected, setSelected] = useState<GraphNode | null>(null);

  if (!lessonId) return <EmptyState icon={<NetworkIcon size={24} />} text={t("tutor.graphNoLesson")} />;

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  if (isLoading) return <EmptyState icon={<NetworkIcon size={24} />} text={t("tutor.graphLoading")} />;
  if (nodes.length === 0) return <EmptyState icon={<NetworkIcon size={24} />} text={t("tutor.graphEmpty")} />;

  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 40;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    positions.set(n.id, { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) });
  });

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-[var(--ink-faint)] mb-3">{t("tutor.graphHint")}</p>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
        {edges.map((e, i) => {
          const from = positions.get(e.from);
          const to = positions.get(e.to);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--border-secondary)" strokeWidth={1.5} />
              <text x={midX} y={midY} fontSize={8} textAnchor="middle" fill="var(--ink-faint)" style={{ paintOrder: "stroke", stroke: "var(--card-bg)", strokeWidth: 3 }}>
                {e.relationship}
              </text>
            </g>
          );
        })}
        {nodes.map((n, i) => {
          const pos = positions.get(n.id)!;
          const color = GRAPH_COLORS[i % GRAPH_COLORS.length];
          const isSelected = selected?.id === n.id;
          return (
            <g key={n.id} onClick={() => setSelected(n)} className="cursor-pointer">
              <circle cx={pos.x} cy={pos.y} r={isSelected ? 26 : 22} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
              <text x={pos.x} y={pos.y} fontSize={9} textAnchor="middle" dominantBaseline="middle" fill={color} fontWeight={600}>
                {n.label.length > 10 ? `${n.label.slice(0, 9)}…` : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {selected && (
        <div className="mt-3 w-full rounded-[var(--radius-xl)] border border-[var(--border-secondary)] bg-[var(--paper)] p-3 text-center animate-pop-in">
          <p className="font-display text-sm mb-1">{selected.label}</p>
          <p className="text-xs text-[var(--ink-soft)]">
            <MathText text={selected.description} />
          </p>
        </div>
      )}
    </div>
  );
}

function StudioTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-2xl)] border border-[var(--border-secondary)] bg-[var(--paper)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors text-start cursor-pointer"
    >
      <IconChip icon={icon} size={40} />
      <span className="font-display text-sm font-semibold">{label}</span>
    </button>
  );
}

type StudioView = "menu" | "flashcards" | "graph";

/** The lesson page's left-hand column, styled after NotebookLM's Studio panel per the user's
 * reference: a menu of generation tiles (flashcards, knowledge graph) that open in place within
 * the same panel, rather than a tabbed layout or a separate modal. */
export function LessonStudio({ lessonId }: { lessonId: string }) {
  const [view, setView] = useState<StudioView>("menu");
  const { t, locale } = useTranslation();

  const viewIcon = view === "graph" ? <NetworkIcon size={18} /> : view === "flashcards" ? <CardsIcon size={18} /> : <ChatBubbleIcon size={18} />;
  const viewTitle = view === "graph" ? t("tutor.tabGraph") : view === "flashcards" ? t("tutor.tabFlashcards") : t("tutor.studioTitle");

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[var(--border-secondary)] shrink-0">
        {view !== "menu" && (
          <button onClick={() => setView("menu")} className="text-[var(--ink-faint)] hover:text-[var(--ink)] p-1 cursor-pointer shrink-0">
            <ChevronLeftIcon size={18} />
          </button>
        )}
        <h2 className="font-display text-base flex items-center gap-2.5 min-w-0">
          <IconChip icon={viewIcon} />
          <span className="truncate">{viewTitle}</span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {view === "menu" && (
          <div className="flex flex-col gap-3">
            <StudioTile icon={<CardsIcon size={20} />} label={t("tutor.tabFlashcards")} onClick={() => setView("flashcards")} />
            <StudioTile icon={<NetworkIcon size={20} />} label={t("tutor.tabGraph")} onClick={() => setView("graph")} />
          </div>
        )}
        {view === "flashcards" && <FlashcardsTab lessonId={lessonId} />}
        {view === "graph" && <GraphTab lessonId={lessonId} />}
      </div>
    </div>
  );
}

/** The lesson page's right-hand column: just the lesson-scoped chat, without the tab bar (the
 * lesson page's LessonStudio covers flashcards/knowledge graph in its own left column instead). */
export function LessonChatPanel({ lessonId }: { lessonId: string }) {
  const { t, locale } = useTranslation();
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="h-full flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--border-secondary)] shrink-0">
        <h2 className="font-display text-base flex items-center gap-2.5">
          <IconChip icon={<ChatBubbleIcon size={18} />} />
          {t("tutor.title")}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 min-h-0">
        <ChatTab lessonId={lessonId} />
      </div>
    </div>
  );
}

function TutorPanelBody({ lessonId, onClose }: { lessonId?: string; onClose?: () => void }) {
  const [tab, setTab] = useState<Tab>("chat");
  const { t, locale } = useTranslation();

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-secondary)] shrink-0">
        <h2 className="font-display text-base flex items-center gap-2.5">
          <IconChip icon={<ChatBubbleIcon size={18} />} />
          {t("tutor.title")}
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-[var(--ink-faint)] hover:text-[var(--ink)] p-1 cursor-pointer">
            <CrossIcon size={16} />
          </button>
        )}
      </div>
      <div className="flex gap-1 p-3 shrink-0">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<ChatBubbleIcon size={15} />} label={t("tutor.tabChat")} />
        <TabButton active={tab === "flashcards"} onClick={() => setTab("flashcards")} icon={<CardsIcon size={15} />} label={t("tutor.tabFlashcards")} />
        <TabButton active={tab === "graph"} onClick={() => setTab("graph")} icon={<NetworkIcon size={15} />} label={t("tutor.tabGraph")} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {tab === "chat" && <ChatTab key={lessonId ?? "plan"} lessonId={lessonId} />}
        {tab === "flashcards" && <FlashcardsTab key={lessonId ?? "plan"} lessonId={lessonId} />}
        {tab === "graph" && <GraphTab key={lessonId ?? "plan"} lessonId={lessonId} />}
      </div>
    </div>
  );
}

/** Persistent on desktop (always visible, docked to the physical left of the app, alongside
 * AppShell's main content and right-hand nav) so the tutor is available from anywhere, not just
 * lesson pages — collapsible only on mobile, where a full-width sidebar would block the app.
 * Styled with the same card/radius/shadow tokens as the rest of the dashboard (see Card.tsx,
 * globals.css) so it reads as a native part of the app rather than a bolted-on widget.
 * Picks up the current lesson (if any) straight from the route via useParams, and warms the
 * flashcards/knowledge-graph cache the moment a lesson is opened so both tabs are ready before
 * the student ever clicks them (see the prefetch effect below).
 *
 * On the lesson page's own desktop layout (chat right / studio left, see LessonStudio and the
 * lesson page component), this sidebar would be a redundant second AI panel, so it hides itself
 * there — the lesson page renders ChatTab/LessonStudio inline instead. On mobile, where the
 * lesson page falls back to its plain single-column layout, this stays available as usual. */
export function TutorPanel() {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!lessonId) return;
    preload(flashcardsKey(lessonId), apiFetcher);
    preload(knowledgeGraphKey(lessonId), apiFetcher);
  }, [lessonId]);

  return (
    <>
      {/* Desktop: always-open sidebar, docked to the physical left — except on a lesson page,
          which builds its own chat+studio layout inline instead. */}
      {!lessonId && (
        <div
          className="hidden sm:flex w-[360px] shrink-0 rounded-[var(--radius-4xl)] border border-[var(--border-secondary)] bg-[var(--card-bg)] shadow-[var(--shadow-sm)] overflow-hidden"
          style={{ order: -1 }}
        >
          <TutorPanelBody lessonId={lessonId} />
        </div>
      )}

      {/* Mobile: floating toggle + full-screen overlay, since a 360px sidebar would eat the whole viewport */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={t("tutor.toggle")}
        className="sm:hidden fixed left-4 bottom-4 z-40 w-14 h-14 rounded-full shadow-[var(--shadow-md)] flex items-center justify-center bg-[var(--accent)] text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <ChatBubbleIcon size={26} />
      </button>

      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-[var(--card-bg)] animate-pop-in">
          <TutorPanelBody lessonId={lessonId} onClose={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
