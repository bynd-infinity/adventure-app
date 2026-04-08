"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createLobbyAction, joinLobbyAction } from "@/app/actions/lobby";
import type { GameDifficulty } from "@/config/difficulty";
import { GAME_DIFFICULTY_LABELS } from "@/config/difficulty";
import { LOBBY_STORY_HOOK_OPTIONS } from "@/config/lobbySettings";
import { setStoredPlayerId } from "@/lib/lobby/storage";

export function HomeLobbyForms() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createName, setCreateName] = useState("");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("standard");
  const [storyHook, setStoryHook] = useState<string>("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleStart(e: FormEvent) {
    e.preventDefault();
    const name = createName.trim();
    if (!name) {
      setError("Enter your name to start.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createLobbyAction(name, {
        mode: "solo",
        difficulty,
        storyHook: storyHook.trim() === "" ? null : storyHook.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStoredPlayerId(result.sessionId, result.playerId);
      router.push(`/lobby/${result.code}`);
    });
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
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <form
        onSubmit={handleStart}
        className="scene-card flex flex-col gap-4 rounded-xl border border-violet-700/45 bg-zinc-950/80 p-5 text-left"
      >
        <h2 className="text-base font-semibold text-violet-100">Start</h2>
        <p className="text-sm text-zinc-400">
          Open a Blackglass run: pick difficulty and why you came, then ready up in the
          lobby. Share the code if friends are joining the same ledger.
        </p>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Your name
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
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Difficulty
          <select
            value={difficulty}
            onChange={(ev) => setDifficulty(ev.target.value as GameDifficulty)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-600"
          >
            {(Object.keys(GAME_DIFFICULTY_LABELS) as GameDifficulty[]).map((id) => (
              <option key={id} value={id}>
                {GAME_DIFFICULTY_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Story hook
          <select
            value={storyHook}
            onChange={(ev) => setStoryHook(ev.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-600"
          >
            {LOBBY_STORY_HOOK_OPTIONS.map((opt) => (
              <option key={opt.id || "default"} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            {LOBBY_STORY_HOOK_OPTIONS.find((o) => o.id === storyHook)?.description}
          </span>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          Start
        </button>
      </form>

      <form
        onSubmit={handleJoin}
        className="scene-card flex flex-col gap-3 rounded-xl border border-zinc-700/50 bg-zinc-950/60 p-4 text-left"
      >
        <h2 className="text-sm font-medium text-zinc-300">Join with code</h2>
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
          Join
        </button>
      </form>

      {error ? (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
