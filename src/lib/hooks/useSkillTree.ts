"use client";

import useSWR from "swr";
import { apiFetcher } from "./useApi";

export interface TreeSkillNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  tier: number;
  col: number;
  milestone: { id: string; title: string } | null;
  prerequisiteIds: string[];
  lessons: { id: string; title: string; order: number }[];
  status: "LOCKED" | "UNLOCKED" | "IN_PROGRESS" | "COMPLETED";
  bestScore: number;
  completedAt: string | null;
}

export function useSkillTree(pathId: string) {
  const { data, mutate, isLoading } = useSWR<{ nodes: TreeSkillNode[] }>(`/api/paths/${pathId}/tree`, apiFetcher);
  return { nodes: data?.nodes ?? [], mutate, isLoading };
}
