"use client";

import useSWR from "swr";
import { apiFetcher } from "./useApi";
import type { StreakCalendarDay } from "@/lib/gamification/streak";

export interface ProfileResponse {
  name: string;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXp: number;
  hearts: number;
  heartsMax: number;
  nextRegenAt: string | null;
  currentStreak: number;
  bestStreak: number;
  calendar: StreakCalendarDay[];
}

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<ProfileResponse>("/api/profile", apiFetcher, {
    refreshInterval: 60_000,
  });
  return { profile: data, error, isLoading, mutate };
}
