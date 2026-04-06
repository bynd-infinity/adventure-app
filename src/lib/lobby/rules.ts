import type { Player } from "@/types";

export function lobbyStartConditionsMet(players: Player[]): boolean {
  if (players.length < 2) return false;
  for (const p of players) {
    if (!p.class) return false;
    if (!p.ready) return false;
  }
  return true;
}
