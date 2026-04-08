export type Player = {
  id: string;
  name: string;
  "class": string;
  hp: number;
  isHost: boolean;
  turnOrder: number;
  ready: boolean;
};

import type { GameDifficulty } from "@/config/difficulty";

export type SessionMode = "solo" | "party";

export type Session = {
  id: string;
  code: string;
  status: string;
  currentScene: string;
  turnIndex: number;
  mode: SessionMode;
  /** Combat / pacing tuning. */
  difficulty: GameDifficulty;
  /** Campaign hook id, or null to pick in-game. */
  storyHook: string | null;
};

/** Phase 3 — Project-Outline.txt */
export type GamePhase = "player" | "enemy";

export type EnemyBehavior = "aggressive" | "fragile" | "defensive" | "boss";

/** Optional tag for light combat / UI flavor (spectral → slipperier targets). */
export type EnemyTraitTag = "spectral" | "mundane";

export type Enemy = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  behavior: EnemyBehavior;
  /** Used when this enemy resolves an attack. */
  baseDamage: number;
  templateId: string;
  roleLabel?: string;
  /** Short label in combat UI (e.g. Spectral, Armored). */
  traitLabel?: string;
  traitTag?: EnemyTraitTag;
  /** Optional sprite path under /public/enemies. */
  spriteSrc?: string;
};

export type GameState = {
  scene: string;
  players: Player[];
  enemies: Enemy[];
  turnIndex: number;
  phase: GamePhase;
};
