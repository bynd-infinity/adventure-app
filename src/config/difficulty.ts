import type { Enemy } from "@/types";

export type GameDifficulty = "story" | "standard" | "hard";

export const GAME_DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  story: "Story",
  standard: "Standard",
  hard: "Hard",
};

export function normalizeGameDifficulty(raw: string | null | undefined): GameDifficulty {
  if (raw === "story" || raw === "hard") return raw;
  return "standard";
}

/** Multipliers applied to tuning knobs (not raw dice). */
export function difficultyCombatMods(d: GameDifficulty): {
  playerDamageMul: number;
  enemyHpMul: number;
  enemyDamageMul: number;
} {
  switch (d) {
    case "story":
      return { playerDamageMul: 1.12, enemyHpMul: 0.88, enemyDamageMul: 0.78 };
    case "hard":
      return { playerDamageMul: 0.9, enemyHpMul: 1.18, enemyDamageMul: 1.12 };
    default:
      return { playerDamageMul: 1, enemyHpMul: 1, enemyDamageMul: 1 };
  }
}

export function scaleEnemiesForDifficulty(
  enemies: Enemy[],
  d: GameDifficulty,
): Enemy[] {
  const { enemyHpMul } = difficultyCombatMods(d);
  if (enemyHpMul === 1) return enemies;
  return enemies.map((e) => {
    const maxHp = Math.max(1, Math.round(e.maxHp * enemyHpMul));
    const hp = Math.min(maxHp, Math.max(1, Math.round(e.hp * enemyHpMul)));
    return { ...e, maxHp, hp };
  });
}
