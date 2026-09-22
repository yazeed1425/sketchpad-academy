export type BadgeCriteriaKind =
  | "STREAK_DAYS"
  | "SKILLS_COMPLETED"
  | "LEVEL_REACHED"
  | "LEAGUE_PROMOTIONS"
  | "PERFECT_QUIZZES"
  | "PATH_COMPLETED";

export interface UserStatsSnapshot {
  bestStreak: number;
  skillsCompleted: number;
  level: number;
  leaguePromotions: number;
  perfectQuizzes: number;
  pathsCompleted: number;
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
  }
}
