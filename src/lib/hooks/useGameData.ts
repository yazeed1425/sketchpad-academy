"use client";

import useSWR from "swr";
import { apiFetcher } from "./useApi";

export interface DailyQuest {
  id: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
}

export function useDailyQuests() {
  const { data, mutate, isLoading } = useSWR<{ quests: DailyQuest[] }>("/api/quests/daily", apiFetcher);
  return { quests: data?.quests ?? [], mutate, isLoading };
}

export interface LeagueMember {
  userId: string;
  name: string;
  weeklyXp: number;
  rank: number;
  isMe: boolean;
}

export function useLeague() {
  const { data, mutate, isLoading } = useSWR<{ tier: string; weekId: string; members: LeagueMember[] }>(
    "/api/leagues/me",
    apiFetcher
  );
  return { league: data, mutate, isLoading };
}

export interface Badge {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export function useBadges() {
  const { data, mutate, isLoading } = useSWR<{ badges: Badge[] }>("/api/badges", apiFetcher);
  return { badges: data?.badges ?? [], mutate, isLoading };
}

export interface LearningPathSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  skillCount: number;
  completedCount: number;
  enrolled: boolean;
  milestones: { id: string; title: string; description: string }[];
}

export function usePaths() {
  const { data, mutate, isLoading } = useSWR<{ paths: LearningPathSummary[] }>("/api/paths", apiFetcher);
  return { paths: data?.paths ?? [], mutate, isLoading };
}
