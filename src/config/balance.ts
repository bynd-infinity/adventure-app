import type { RoomId } from "@/lib/story/rooms";

/** Base combat damage before variance and tier modifiers. */
export const BASE_DAMAGE = 5;

/** Half-range of the d(2n+1) variance roll (see resolveAttackDamage). */
export const DAMAGE_VARIANCE = 2;

/** HUD pulse duration for impact feedback (ms). */
export const UI_PULSE_MS = 280;

/** Screen shake duration (ms). */
export const UI_SHAKE_MS = 240;

export type TimingProfile = {
  decisionLockMs: number;
  combatTransitionMs: number;
  combatWindupMs: number;
  combatImpactMs: number;
  /** After your attack resolves — pause before the enemy telegraphs (readability). */
  combatAfterPlayerPauseMs: number;
  combatEnemyWindupMs: number;
  combatResolveGapMs: number;
};

/**
 * Per-room pacing for decisions and combat staging. Tune in one place; see BALANCE.md.
 */
export const ROOM_TIMING_PROFILE: Record<RoomId, TimingProfile> = {
  entrance_hall: {
    decisionLockMs: 540,
    combatTransitionMs: 470,
    combatWindupMs: 180,
    combatImpactMs: 150,
    combatAfterPlayerPauseMs: 420,
    combatEnemyWindupMs: 360,
    combatResolveGapMs: 280,
  },
  registry_gallery: {
    decisionLockMs: 560,
    combatTransitionMs: 480,
    combatWindupMs: 185,
    combatImpactMs: 160,
    combatAfterPlayerPauseMs: 430,
    combatEnemyWindupMs: 370,
    combatResolveGapMs: 285,
  },
  library: {
    decisionLockMs: 580,
    combatTransitionMs: 500,
    combatWindupMs: 190,
    combatImpactMs: 165,
    combatAfterPlayerPauseMs: 440,
    combatEnemyWindupMs: 380,
    combatResolveGapMs: 290,
  },
  servants_corridor: {
    decisionLockMs: 520,
    combatTransitionMs: 450,
    combatWindupMs: 165,
    combatImpactMs: 145,
    combatAfterPlayerPauseMs: 400,
    combatEnemyWindupMs: 345,
    combatResolveGapMs: 265,
  },
  dining_room: {
    decisionLockMs: 560,
    combatTransitionMs: 485,
    combatWindupMs: 185,
    combatImpactMs: 160,
    combatAfterPlayerPauseMs: 430,
    combatEnemyWindupMs: 375,
    combatResolveGapMs: 285,
  },
  boss_room: {
    decisionLockMs: 620,
    combatTransitionMs: 560,
    combatWindupMs: 210,
    combatImpactMs: 175,
    combatAfterPlayerPauseMs: 480,
    combatEnemyWindupMs: 400,
    combatResolveGapMs: 310,
  },
};
