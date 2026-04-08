import type { Player, SessionMode } from "@/types";

export function lobbyStartConditionsMet(
  players: Player[],
  mode: SessionMode,
): boolean {
  const minPlayers = mode === "solo" ? 1 : 2;
  if (players.length < minPlayers) return false;
  for (const p of players) {
    if (!p.ready) return false;
  }
  return true;
}
