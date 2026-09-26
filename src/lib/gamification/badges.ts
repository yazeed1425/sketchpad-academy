export type BadgeCriteriaKind =
  | "STREAK_DAYS"
  | "SKILLS_COMPLETED"
  | "LEVEL_REACHED"
  | "LEAGUE_PROMOTIONS"
  | "PERFECT_QUIZZES"
  | "PATH_COMPLETED"
  | "WEAK_TOPIC_MASTERED"
  | "COMEBACK";

export interface UserStatsSnapshot {
  bestStreak: number;
  skillsCompleted: number;
  level: number;
  leaguePromotions: number;
  perfectQuizzes: number;
  pathsCompleted: number;
  // Skills completed whose Skill.diagnosedMastery was GAP or DEVELOPING — rewards closing a
  // diagnosed weak spot specifically, not just completing any skill (Table 2/3 of the
  // gamification research).
  weakTopicsMastered: number;
  // Skills completed that took more than one real (non-practice) attempt on their lesson —
  // rewards personal improvement/persistence over first-try performance.
  comebacks: number;
}

export function meetsBadgeCriteria(criteria: BadgeCriteriaKind, criteriaValue: number, stats: UserStatsSnapshot): boolean {
  switch (criteria) {
    case "STREAK_DAYS":
      return stats.bestStreak >= criteriaValue;
    case "SKILLS_COMPLETED":
      return stats.skillsCompleted >= criteriaValue;
    case "LEVEL_REACHED":
      return stats.level >= criteriaValue;
    case "LEAGUE_PROMOTIONS":
      return stats.leaguePromotions >= criteriaValue;
    case "PERFECT_QUIZZES":
      return stats.perfectQuizzes >= criteriaValue;
    case "PATH_COMPLETED":
      return stats.pathsCompleted >= criteriaValue;
    case "WEAK_TOPIC_MASTERED":
      return stats.weakTopicsMastered >= criteriaValue;
    case "COMEBACK":
      return stats.comebacks >= criteriaValue;
  }
}
