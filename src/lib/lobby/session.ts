import type { GameDifficulty } from "@/config/difficulty";
import { getSupabaseClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session, SessionMode } from "@/types";
import { randomLobbyCode } from "./code";
import { mapSessionRow } from "./mappers";
import type { SessionRow } from "./types";

const UNIQUE_VIOLATION = "23505";

export type CreateSessionOptions = {
  difficulty?: GameDifficulty;
  /** Set to hook id, or omit / null for in-game choice. */
  storyHook?: string | null;
};

export async function createSession(
  mode: SessionMode,
  client: SupabaseClient = getSupabaseClient(),
  opts: CreateSessionOptions = {},
): Promise<Session> {
  const difficulty = opts.difficulty ?? "standard";
  const storyHook =
    opts.storyHook && opts.storyHook.trim() !== ""
      ? opts.storyHook.trim()
      : null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomLobbyCode();
    const { data, error } = await client
      .from("sessions")
      .insert({ code, mode, difficulty, story_hook: storyHook })
      .select()
      .single();

    console.log("SUPABASE RESULT:", { data, error });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        console.log(
          "SUPABASE: unique lobby code collision, retrying",
          error.message,
        );
        continue;
      }
      console.error("SUPABASE ERROR:", error);
      throw error;
    }
    return mapSessionRow(data as SessionRow);
  }
  throw new Error("Could not generate a unique lobby code.");
}

export async function fetchSessionById(
  sessionId: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Session | null> {
  const { data, error } = await client
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSessionRow(data as SessionRow);
}

export async function findSessionByCode(
  rawCode: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Session | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await client
    .from("sessions")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSessionRow(data as SessionRow);
}

export async function setSessionActive(
  sessionId: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from("sessions")
    .update({ status: "active" })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
}

export async function updateSessionLobbySettings(
  sessionId: string,
  updates: { difficulty?: GameDifficulty; storyHook?: string | null },
  client: SupabaseClient = getSupabaseClient(),
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.difficulty !== undefined) {
    payload.difficulty = updates.difficulty;
  }
  if (updates.storyHook !== undefined) {
    const v = updates.storyHook;
    payload.story_hook =
      v && String(v).trim() !== "" ? String(v).trim() : null;
  }
  if (Object.keys(payload).length === 0) return;

  const { error } = await client
    .from("sessions")
    .update(payload)
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
}
