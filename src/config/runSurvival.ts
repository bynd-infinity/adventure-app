import type { ExplorationActionKind } from "@/lib/game/explorationResolve";
import type { PlayerClassId } from "@/lib/lobby/constants";

/** Consumables and rests carried for this run (Sweet Home–style attrition, web-friendly). */
export type RunSuppliesState = {
  tonic: number;
  revivalBalm: number;
  /** Limited full rests while exploring (does not revive the fallen). */
  sanctuaryRestCharges: number;
};

export const INITIAL_RUN_SUPPLIES: RunSuppliesState = {
  tonic: 1,
  revivalBalm: 1,
  sanctuaryRestCharges: 2,
};

export const SUPPLY_CAPS = {
  tonic: 4,
  revivalBalm: 2,
} as const;

/** In combat: heal active fighter for this fraction of max HP (living only). */
export const TONIC_HEAL_FRACTION = 0.28;

/** Revival balm: restored HP fraction for a downed party member (once per use). */
export const BALM_REVIVE_HP_FRACTION = 0.35;

/**
 * Once per room, first time this class uses their signature exploration action,
 * the outcome tier is bumped one step (see `bumpOutcomeTier`).
 */
export const CLASS_SIGNATURE_ACTION: Record<
  PlayerClassId,
  ExplorationActionKind
> = {
  Blade: "search",
  Spark: "inspect",
  Shadow: "inspect",
  Guard: "listen",
};

export const CLASS_SIGNATURE_BLURB: Record<PlayerClassId, string> = {
  Blade: "Muscle memory steadies your search.",
  Spark: "Your attention locks to the line of the text.",
  Shadow: "You read the margin like a second voice.",
  Guard: "You hold for sound before you commit.",
};
