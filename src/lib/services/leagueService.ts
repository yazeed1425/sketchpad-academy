import { db } from "@/lib/db";
import { assignDivisions, computeWeekOutcomes, weekId as currentWeekId, DIVISION_MAX_SIZE } from "@/lib/gamification/leagues";
import type { $Enums } from "@/generated/prisma/client";

const TIER_ORDER: $Enums.LeagueTier[] = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];
void assignDivisions; // reserved for a future bulk re-seeding job; per-user placement below covers normal signup flow

async function getOrCreateLeague(tier: $Enums.LeagueTier) {
  return db.league.upsert({
    where: { tier },
    create: { tier, order: TIER_ORDER.indexOf(tier) },
    update: {},
  });
}

async function findOpenDivision(leagueId: string, weekId: string) {
  const divisions = await db.leagueDivision.findMany({
    where: { leagueId, weekId },
    include: { _count: { select: { memberships: true } } },
    orderBy: { index: "asc" },
  });
  const open = divisions.find((d) => d._count.memberships < DIVISION_MAX_SIZE);
  if (open) return open;
  return db.leagueDivision.create({ data: { leagueId, weekId, index: divisions.length } });
}

/** Places the user into this week's division, continuing their tier from last week's promotion/demotion. */
export async function ensureCurrentMembership(userId: string) {
  const wId = currentWeekId();
  const existing = await db.leagueMembership.findFirst({ where: { userId, division: { weekId: wId } } });
  if (existing) return existing;

  const lastMembership = await db.leagueMembership.findFirst({
    where: { userId },
    orderBy: { division: { weekId: "desc" } },
    include: { division: { include: { league: true } } },
  });

  let tier: $Enums.LeagueTier = "BRONZE";
  if (lastMembership) {
    const lastTierIndex = TIER_ORDER.indexOf(lastMembership.division.league.tier);
    if (lastMembership.result === "PROMOTED") tier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, lastTierIndex + 1)];
    else if (lastMembership.result === "DEMOTED") tier = TIER_ORDER[Math.max(0, lastTierIndex - 1)];
    else tier = lastMembership.division.league.tier;
  }

  const league = await getOrCreateLeague(tier);
  const division = await findOpenDivision(league.id, wId);
  return db.leagueMembership.create({ data: { userId, divisionId: division.id, weeklyXp: 0 } });
}

export async function getMyLeagueStanding(userId: string) {
  const membership = await ensureCurrentMembership(userId);
  return db.leagueDivision.findUniqueOrThrow({
    where: { id: membership.divisionId },
    include: {
      league: true,
      memberships: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { weeklyXp: "desc" },
      },
    },
  });
}

/** Closes out a finished week: ranks every division and stamps PROMOTED/HELD/DEMOTED. Intended for a weekly cron. */
export async function closeWeek(wId: string) {
  const divisions = await db.leagueDivision.findMany({
    where: { weekId: wId },
    include: { memberships: true, league: true },
  });

  for (const division of divisions) {
    const isTopTier = division.league.tier === TIER_ORDER[TIER_ORDER.length - 1];
    const isBottomTier = division.league.tier === TIER_ORDER[0];
    const outcomes = computeWeekOutcomes(
      division.memberships.map((m) => ({ userId: m.userId, weeklyXp: m.weeklyXp })),
      { isTopTier, isBottomTier }
    );

    await db.$transaction(
      outcomes.map((o) =>
        db.leagueMembership.update({
          where: { userId_divisionId: { userId: o.userId, divisionId: division.id } },
          data: { rank: o.rank, result: o.result },
        })
      ),
      { timeout: 20000 }
    );
  }
}
