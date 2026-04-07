import {
  isValidPlayerClass,
  type PlayerClassId,
} from "@/lib/lobby/constants";

export type RpgCombatStats = {
  power: number;
  skill: number;
  mind: number;
  guard: number;
};

const DEFAULT: RpgCombatStats = { power: 1, skill: 1, mind: 1, guard: 1 };

/** Starting combat stats by lobby class (rewards can still raise these). */
const BY_CLASS: Record<PlayerClassId, RpgCombatStats> = {
  Blade: { power: 3, skill: 1, mind: 1, guard: 1 },
  Spark: { power: 1, skill: 1, mind: 3, guard: 1 },
  Shadow: { power: 1, skill: 3, mind: 1, guard: 1 },
  Guard: { power: 1, skill: 1, mind: 1, guard: 3 },
};

export function initialRpgStatsForClass(className: string): RpgCombatStats {
  if (isValidPlayerClass(className)) {
    return BY_CLASS[className];
  }
  return DEFAULT;
}
