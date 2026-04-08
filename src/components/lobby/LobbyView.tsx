"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  setPlayerReadyAction,
  startGameAction,
} from "@/app/actions/lobby";
import { lobbyStartConditionsMet } from "@/lib/lobby/rules";
import { getStoredPlayerId } from "@/lib/lobby/storage";
import { getSupabaseClient } from "@/lib/supabase";
import type { Player, Session } from "@/types";

type LobbyViewProps = {
  session: Session;
  players: Player[];
};

export function LobbyView({ session, players }: LobbyViewProps) {
  const router = useRouter();
  const [currentPlayerId] = useState<string | null>(() =>
    getStoredPlayerId(session.id),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`lobby:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.id, router]);

  const current = players.find((p) => p.id === currentPlayerId);
  const canStart = lobbyStartConditionsMet(players, session.mode);

  function handleReadyToggle(playerId: string, next: boolean) {
    setActionError(null);
    startTransition(async () => {
      const result = await setPlayerReadyAction(
        playerId,
        next,
        session.code,
      );
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleStart() {
    if (!currentPlayerId) return;
    setActionError(null);
    startTransition(async () => {
      const result = await startGameAction(session.id, currentPlayerId);
      if (result && !result.ok) {
        setActionError(result.error);
      }
    });
  }

  if (!currentPlayerId) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-white">
        <main className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Lobby</h1>
          <p className="mt-4 text-zinc-400">
            No player identity found for this session. Create or join a lobby
            from the home page first.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-white">
        <main className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Lobby</h1>
          <p className="mt-4 text-zinc-400">
            Your saved player is not in this lobby. Join again with the correct
            code.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 px-6 py-10 text-white">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-semibold">Lobby</h1>
          <p className="mt-2 text-sm font-medium text-violet-300">
            Mode: {session.mode === "solo" ? "Solo" : "Party"}
          </p>
          <p className="mt-2 font-mono text-lg tracking-widest text-zinc-300">
            {session.code}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {session.mode === "solo"
              ? "Solo run — invite friends with the code if you like."
              : "Share this code with other players."}
          </p>
        </header>

        {actionError ? (
          <p className="text-center text-sm text-red-400" role="alert">
            {actionError}
          </p>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Players</h2>
          <ul className="flex flex-col gap-3">
            {players.map((player) => {
              const isSelf = player.id === currentPlayerId;
              return (
                <li
                  key={player.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{player.name}</span>
                      {player.isHost ? (
                        <span className="ml-2 text-xs text-amber-400">
                          Host
                        </span>
                      ) : null}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-zinc-500">You</span>
                      ) : null}
                    </div>
                    <span
                      className={
                        player.ready ? "text-emerald-400" : "text-zinc-500"
                      }
                    >
                      {player.ready ? "Ready" : "Not ready"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-zinc-400">
                      Class: <span className="text-zinc-500">Chosen after intro</span>
                    </div>

                    {isSelf ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleReadyToggle(player.id, !player.ready)
                          }
                          className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {player.ready ? "Unready" : "Ready"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {current.isHost ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={isPending || !canStart}
              onClick={handleStart}
              className="rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Game
            </button>
            {!canStart ? (
              <p className="text-center text-xs text-zinc-500">
                {session.mode === "solo"
                  ? "Mark ready to begin."
                  : "Need at least 2 players; everyone must be ready."}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-sm text-zinc-600">
          <Link href="/" className="underline hover:text-zinc-400">
            Leave
          </Link>
        </p>
      </main>
    </div>
  );
}
