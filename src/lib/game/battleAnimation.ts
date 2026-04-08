/**
 * Player-side battle presentation during the staged attack sequence.
 * Drives portrait pose / optional strike art in BattleArena.
 */
export type BattlePlayerPhase =
  | "idle"
  | "windup"
  | "strike"
  | "enemy"
  | "recover";
