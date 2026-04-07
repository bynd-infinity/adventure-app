import type { Player, Session } from "@/types";
import type { PlayerRow, SessionRow } from "./types";

export function mapSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    currentScene: row.current_scene,
    turnIndex: row.turn_index,
  };
}

export function mapPlayerRow(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    class: row["class"],
    hp: row.hp,
    isHost: row.is_host,
    turnOrder: row.turn_order,
    ready: row.is_ready,
  };
}
