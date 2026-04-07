import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { Player } from "@/types";
import { isValidPlayerClass } from "./constants";
import { mapPlayerRow } from "./mappers";
import type { PlayerRow } from "./types";

export async function createHostPlayer(
  sessionId: string,
  name: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Player> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");

  const { data, error } = await client
    .from("players")
    .insert({
      session_id: sessionId,
      name: trimmed,
      is_host: true,
      turn_order: 0,
      class: "",
      hp: 100,
      is_ready: false,
    })
    .select()
    .single();

  console.log("SUPABASE RESULT:", { data, error });

  if (error) {
    console.error("SUPABASE ERROR:", error);
    throw error;
  }
  return mapPlayerRow(data as PlayerRow);
}

export async function joinSessionAsPlayer(
  sessionId: string,
  name: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Player> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");

  const { data: lastRow, error: orderError } = await client
    .from("players")
    .select("turn_order")
    .eq("session_id", sessionId)
    .order("turn_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  const nextTurn = lastRow ? lastRow.turn_order + 1 : 0;

  const { data, error } = await client
    .from("players")
    .insert({
      session_id: sessionId,
      name: trimmed,
      is_host: false,
      turn_order: nextTurn,
      class: "",
      hp: 100,
      is_ready: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapPlayerRow(data as PlayerRow);
}

export async function fetchPlayersForSession(
  sessionId: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Player[]> {
  const { data, error } = await client
    .from("players")
    .select("*")
    .eq("session_id", sessionId)
    .order("turn_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as PlayerRow[]).map(mapPlayerRow);
}

export async function fetchPlayerById(
  playerId: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Player | null> {
  const { data, error } = await client
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapPlayerRow(data as PlayerRow);
}

export async function updatePlayerClass(
  playerId: string,
  characterClass: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Player> {
  if (!isValidPlayerClass(characterClass)) {
    throw new Error("Invalid class.");
  }

  const { data, error } = await client
    .from("players")
    .update({ class: characterClass })
    .eq("id", playerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapPlayerRow(data as PlayerRow);
}

export async function setPlayerReady(
  playerId: string,
  ready: boolean,
  client: SupabaseClient = getSupabaseClient(),
): Promise<Player> {
  const { data, error } = await client
    .from("players")
    .update({ is_ready: ready })
    .eq("id", playerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapPlayerRow(data as PlayerRow);
}

export async function verifySessionHost(
  sessionId: string,
  playerId: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<boolean> {
  const { data, error } = await client
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("session_id", sessionId)
    .eq("is_host", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data;
}
