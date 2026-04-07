import { mapPlayerRow } from "@/lib/lobby/mappers";
import type { PlayerRow } from "@/lib/lobby/types";
import type { GameState } from "@/types";

/**
 * Builds initial in-memory game state from DB player rows (snake_case fields).
 * Does not persist; lobby `Player` shape is reused per Project-Outline GameState.players.
 */
export function createInitialGameState(rows: PlayerRow[]): GameState {
  const sorted = [...rows].sort((a, b) => a.turn_order - b.turn_order);
  const players = sorted.map(mapPlayerRow);

  return {
    scene: "entrance_hall",
    players,
    enemies: [
      { id: "enemy-1", name: "Restless Spirit", hp: 12 },
    ],
    turnIndex: 0,
    phase: "player",
  };
}
