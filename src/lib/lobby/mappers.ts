import { normalizeGameDifficulty } from "@/config/difficulty";
import type { Player, Session, SessionMode } from "@/types";
import type { PlayerRow, SessionRow } from "./types";

function normalizeSessionMode(raw: string | null | undefined): SessionMode {
  return raw === "solo" ? "solo" : "party";
}

export function mapSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    currentScene: row.current_scene,
    turnIndex: row.turn_index,
    mode: normalizeSessionMode(row.mode),
    difficulty: normalizeGameDifficulty(row.difficulty),
    storyHook: row.story_hook?.trim() ? row.story_hook.trim() : null,
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
