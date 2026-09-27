"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import useSWR, { preload } from "swr";
import { RoughButton } from "@/components/ui/RoughButton";
import { MathText } from "@/components/ui/MathText";
import { ChatBubbleIcon, CardsIcon, NetworkIcon, CrossIcon } from "@/components/ui/icons";
import { apiFetcher, apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

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

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs border-b-2 transition-colors ${
        active ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** lessonId present → grounded in that lesson's content; absent → grounded in the student's
 * overall learning plan/progress (see askPlanTutorQuestion), so the panel is always useful even
 * outside a lesson page. */
function ChatTab({ lessonId }: { lessonId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const question = input.trim();
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

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t(lessonId ? "tutor.chatEmpty" : "tutor.chatEmptyPlan")}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-[var(--accent)] text-white" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--border-secondary)]"
              }`}
            >
              <MathText text={m.text} />
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-[var(--ink-faint)]">{t("tutor.chatThinking")}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border-secondary)] pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("tutor.chatPlaceholder")}
          disabled={sending}
          className="flex-1 border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm bg-transparent focus:outline-none focus:border-[var(--accent)]"
        />
        <RoughButton onClick={send} disabled={!input.trim() || sending} className="!px-4 !py-2 !text-sm">
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

  if (!lessonId) return <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t("tutor.flashcardsNoLesson")}</p>;

  const cards = data?.cards ?? [];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
  }

  if (isLoading) return <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t("tutor.flashcardsLoading")}</p>;
  if (cards.length === 0) return <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t("tutor.flashcardsEmpty")}</p>;

  const card = cards[index];

  return (
    <div className="flex flex-col h-full items-center">
      <p className="text-xs text-[var(--ink-faint)] mb-3">{t("tutor.flashcardProgress", { current: index + 1, total: cards.length })}</p>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full flex-1 min-h-[220px] rounded-2xl border-2 border-[var(--border-secondary)] bg-[var(--paper)] flex items-center justify-center p-6 text-center hover:border-[var(--accent)] transition-colors"
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

  if (!lessonId) return <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t("tutor.graphNoLesson")}</p>;

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  if (isLoading) return <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t("tutor.graphLoading")}</p>;
  if (nodes.length === 0) return <p className="text-sm text-[var(--ink-faint)] text-center mt-6">{t("tutor.graphEmpty")}</p>;

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
        <div className="mt-3 w-full rounded-xl border border-[var(--border-secondary)] bg-[var(--paper)] p-3 text-center animate-pop-in">
          <p className="font-display text-sm mb-1">{selected.label}</p>
          <p className="text-xs text-[var(--ink-soft)]">
            <MathText text={selected.description} />
          </p>
        </div>
      )}
    </div>
  );
}

function TutorPanelBody({ lessonId, onClose }: { lessonId?: string; onClose?: () => void }) {
  const [tab, setTab] = useState<Tab>("chat");
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)] shrink-0">
        <h2 className="font-display text-base flex items-center gap-2">
          <ChatBubbleIcon size={18} className="text-[var(--accent)]" />
          {t("tutor.title")}
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-[var(--ink-faint)] hover:text-[var(--ink)] p-1">
            <CrossIcon size={16} />
          </button>
        )}
      </div>
      <div className="flex border-b border-[var(--border-secondary)] shrink-0">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<ChatBubbleIcon size={16} />} label={t("tutor.tabChat")} />
        <TabButton active={tab === "flashcards"} onClick={() => setTab("flashcards")} icon={<CardsIcon size={16} />} label={t("tutor.tabFlashcards")} />
        <TabButton active={tab === "graph"} onClick={() => setTab("graph")} icon={<NetworkIcon size={16} />} label={t("tutor.tabGraph")} />
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
 * Picks up the current lesson (if any) straight from the route via useParams, and warms the
 * flashcards/knowledge-graph cache the moment a lesson is opened so both tabs are ready before
 * the student ever clicks them (see the prefetch effect below). */
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
      {/* Desktop: always-open sidebar, docked to the physical left */}
      <div
        className="hidden sm:flex w-[360px] shrink-0 bg-[var(--card-bg)] rounded-[var(--radius-xl)] border border-[var(--border-secondary)] shadow-[var(--shadow-sm)] overflow-hidden"
        style={{ order: -1 }}
      >
        <TutorPanelBody lessonId={lessonId} />
      </div>

      {/* Mobile: floating toggle + full-screen overlay, since a 360px sidebar would eat the whole viewport */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={t("tutor.toggle")}
        className="sm:hidden fixed left-4 bottom-4 z-40 w-14 h-14 rounded-full shadow-[var(--shadow-md)] flex items-center justify-center bg-[var(--accent)] text-white hover:scale-105 active:scale-95 transition-transform"
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
