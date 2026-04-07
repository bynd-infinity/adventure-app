"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchPlayersForSession,
  joinSessionAsPlayer,
  setPlayerReady,
  updatePlayerClass,
  verifySessionHost,
  createHostPlayer,
} from "@/lib/lobby/players";
import { lobbyStartConditionsMet } from "@/lib/lobby/rules";
import type { SessionMode } from "@/types";
import { getSupabaseClient } from "@/lib/supabase";
import {
  createSession,
  fetchSessionById,
  findSessionByCode,
  setSessionActive,
} from "@/lib/lobby/session";

function lobbyPath(code: string) {
  return `/lobby/${code.trim().toUpperCase()}`;
}

export type LobbyError = { ok: false; error: string };

export async function createLobbyAction(
  hostName: string,
  mode: SessionMode,
): Promise<
  | LobbyError
  | { ok: true; sessionId: string; code: string; playerId: string }
> {
  try {
    if (mode !== "solo" && mode !== "party") {
      return { ok: false, error: "Invalid lobby mode." };
    }

    console.log("ENV CHECK:", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    const supabase = getSupabaseClient();

    const { data: testData, error: testError } = await supabase
      .from("sessions")
      .select("*")
      .limit(1);

    console.log("CONNECTION TEST:", {
      testData,
      testError,
    });

    const session = await createSession(mode, supabase);
    const player = await createHostPlayer(session.id, hostName, supabase);
    return {
      ok: true,
      sessionId: session.id,
      code: session.code,
      playerId: player.id,
    };
  } catch (e) {
    console.error("CREATE LOBBY CAUGHT:", e);
    if (e instanceof Error && e.cause !== undefined) {
      console.error("CREATE LOBBY CAUSE:", e.cause);
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create lobby.",
    };
  }
}

export async function joinLobbyAction(
  code: string,
  playerName: string,
): Promise<
  | LobbyError
  | { ok: true; sessionId: string; code: string; playerId: string }
> {
  try {
    const session = await findSessionByCode(code);
    if (!session) return { ok: false, error: "Lobby not found." };
    if (session.status !== "lobby") {
      return { ok: false, error: "This lobby is no longer open." };
    }
    const player = await joinSessionAsPlayer(session.id, playerName);
    revalidatePath(lobbyPath(session.code));
    return {
      ok: true,
      sessionId: session.id,
      code: session.code,
      playerId: player.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to join lobby.",
    };
  }
}

export async function updatePlayerClassAction(
  playerId: string,
  characterClass: string,
  lobbyCode: string,
): Promise<LobbyError | { ok: true }> {
  try {
    await updatePlayerClass(playerId, characterClass);
    revalidatePath(lobbyPath(lobbyCode));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update class.",
    };
  }
}

export async function setPlayerReadyAction(
  playerId: string,
  ready: boolean,
  lobbyCode: string,
): Promise<LobbyError | { ok: true }> {
  try {
    await setPlayerReady(playerId, ready);
    revalidatePath(lobbyPath(lobbyCode));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update ready state.",
    };
  }
}

export async function startGameAction(
  sessionId: string,
  hostPlayerId: string,
): Promise<LobbyError | void> {
  const isHost = await verifySessionHost(sessionId, hostPlayerId);
  if (!isHost) {
    return { ok: false, error: "Only the host can start the game." };
  }

  let players;
  try {
    players = await fetchPlayersForSession(sessionId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load players.",
    };
  }

  let session;
  try {
    session = await fetchSessionById(sessionId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load session.",
    };
  }

  if (!session) {
    return { ok: false, error: "Session not found." };
  }

  if (!lobbyStartConditionsMet(players, session.mode)) {
    return { ok: false, error: "Start requirements are not met." };
  }

  try {
    await setSessionActive(sessionId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to start session.",
    };
  }

  redirect(`/game/${sessionId}`);
}
