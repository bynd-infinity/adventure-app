"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  createLobbyAction,
  joinLobbyAction,
} from "@/app/actions/lobby";
import { setStoredPlayerId } from "@/lib/lobby/storage";

export function HomeLobbyForms() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function runCreate(mode: "party" | "solo") {
    const name = createName.trim();
    if (!name) {
      setError("Enter your name to create a lobby.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createLobbyAction(name, mode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStoredPlayerId(result.sessionId, result.playerId);
      router.push(`/lobby/${result.code}`);
    });
  }

  function handleCreateParty(e: FormEvent) {
    e.preventDefault();
    runCreate("party");
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinLobbyAction(joinCode, joinName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStoredPlayerId(result.sessionId, result.playerId);
      router.push(`/lobby/${result.code}`);
    });
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="grid gap-5 md:grid-cols-2">
      <form onSubmit={handleCreateParty} className="scene-card flex flex-col gap-3 rounded-xl border border-violet-700/45 bg-zinc-950/80 p-4 text-left">
        <h2 className="text-sm font-medium text-zinc-300">Create lobby</h2>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Host name
          <input
            name="hostName"
            value={createName}
            onChange={(ev) => setCreateName(ev.target.value)}
            required
            autoComplete="off"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-600"
            placeholder="Your name"
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
          >
            Create Party Lobby
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runCreate("solo")}
            className="rounded-lg border border-zinc-600 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-100 disabled:opacity-50"
          >
            Create Solo Lobby
          </button>
        </div>
      </form>

      <form onSubmit={handleJoin} className="scene-card flex flex-col gap-3 rounded-xl border border-violet-700/45 bg-zinc-950/80 p-4 text-left">
        <h2 className="text-sm font-medium text-zinc-300">Join lobby</h2>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Your name
          <input
            name="playerName"
            value={joinName}
            onChange={(ev) => setJoinName(ev.target.value)}
            required
            autoComplete="off"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-600"
            placeholder="Your name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Lobby code
          <input
            name="lobbyCode"
            value={joinCode}
            onChange={(ev) => setJoinCode(ev.target.value.toUpperCase())}
            required
            autoComplete="off"
            maxLength={8}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-white uppercase outline-none focus:border-zinc-600"
            placeholder="ABC123"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Join Lobby
        </button>
      </form>
      </div>

      {error ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
