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
  domainLabel: string | null;
}

export function useSkillTree(pathId: string) {
  // A falsy key tells SWR to skip fetching entirely — callers pass "" before a path exists
  // (e.g. a brand-new user with no active path yet), and `/api/paths//tree` isn't a route at all
  // (it 404s, since the dynamic segment is empty), so there's nothing worth requesting yet.
  const { data, mutate, isLoading } = useSWR<{ nodes: TreeSkillNode[] }>(pathId ? `/api/paths/${pathId}/tree` : null, apiFetcher);
  return { nodes: data?.nodes ?? [], mutate, isLoading };
}
