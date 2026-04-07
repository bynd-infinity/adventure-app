export type Player = {
  id: string;
  name: string;
  "class": string;
  hp: number;
  isHost: boolean;
  turnOrder: number;
  ready: boolean;
};

export type SessionMode = "solo" | "party";

export type Session = {
  id: string;
  code: string;
  status: string;
  currentScene: string;
  turnIndex: number;
  mode: SessionMode;
};

/** Phase 3 — Project-Outline.txt */
export type GamePhase = "player" | "enemy";

export type Enemy = {
  id: string;
  name: string;
  hp: number;
};

export type GameState = {
  scene: string;
  players: Player[];
  enemies: Enemy[];
  turnIndex: number;
  phase: GamePhase;
};
