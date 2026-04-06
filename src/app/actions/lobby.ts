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
import {
  createSession,
  findSessionByCode,
  setSessionActive,
} from "@/lib/lobby/session";

function lobbyPath(code: string) {
  return `/lobby/${code.trim().toUpperCase()}`;
}

export type LobbyError = { ok: false; error: string };

export async function createLobbyAction(hostName: string): Promise<
  | LobbyError
  | { ok: true; sessionId: string; code: string; playerId: string }
> {
  try {
    const session = await createSession();
    const player = await createHostPlayer(session.id, hostName);
    return {
      ok: true,
      sessionId: session.id,
      code: session.code,
      playerId: player.id,
    };
  } catch (e) {
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

  if (!lobbyStartConditionsMet(players)) {
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
