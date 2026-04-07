import { getSupabaseClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@/types";
import { randomLobbyCode } from "./code";
import { mapSessionRow } from "./mappers";
import type { SessionRow } from "./types";

const UNIQUE_VIOLATION = "23505";

export async function createSession(
  client: SupabaseClient = getSupabaseClient(),
): Promise<Session> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomLobbyCode();
    const { data, error } = await client
      .from("sessions")
      .insert({ code })
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
