import Link from "next/link";
import { fetchPlayerRowsForSession } from "@/lib/lobby/players";
import { fetchSessionById } from "@/lib/lobby/session";
import { createInitialGameState } from "@/lib/game/createGameState";
import type { GameState } from "@/types";

const SCENE_LABELS: Record<string, string> = {
  entrance_hall: "Entrance Hall",
};

type GamePageProps = {
  params: Promise<{ sessionId: string }>;
};

function sceneDisplayName(scene: string): string {
  return SCENE_LABELS[scene] ?? scene;
}

function GameShell({ gameState }: { gameState: GameState }) {
  const activePlayer =
    gameState.players.length > 0
      ? gameState.players[
          gameState.turnIndex % gameState.players.length
        ]!
      : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-violet-950/80 bg-zinc-900/80 px-6 py-4">
        <h1 className="text-center text-xl font-semibold tracking-tight text-violet-100 md:text-2xl">
          Haunted House — {sceneDisplayName(gameState.scene)}
        </h1>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-3 md:gap-6 md:p-6">
        {/* Party */}
        <section className="flex flex-col rounded-lg border border-violet-900/50 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-400">
            Party
          </h2>
          <ul className="flex flex-col gap-2">
            {gameState.players.map((p) => {
              const isActive = activePlayer?.id === p.id;
              return (
                <li
                  key={p.id}
                  className={`rounded-md border px-3 py-2 ${
                    isActive
                      ? "border-amber-500/70 bg-amber-950/30 ring-1 ring-amber-600/40"
                      : "border-zinc-700/80 bg-zinc-950/50"
                  }`}
                >
                  <div className="font-medium text-zinc-100">{p.name}</div>
                  <div className="text-sm text-zinc-400">
                    {p.class || "—"} · HP {p.hp}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Scene */}
        <section className="flex min-h-[200px] flex-col rounded-lg border-2 border-dashed border-violet-800/60 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 md:min-h-[280px]">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">
            Scene
          </span>
          <div className="mt-4 flex flex-1 items-center justify-center text-center">
            <p className="text-lg font-medium text-violet-100/90">
              {sceneDisplayName(gameState.scene)}
            </p>
          </div>
          <p className="mt-auto text-center text-xs text-zinc-500">
            Cold air drifts through the hall. Something stirs in the shadows.
          </p>
        </section>

        {/* Enemies */}
        <section className="flex flex-col rounded-lg border border-rose-900/40 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rose-400">
            Foes
          </h2>
          <ul className="flex flex-col gap-2">
            {gameState.enemies.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-rose-900/50 bg-rose-950/20 px-3 py-2"
              >
                <div className="font-medium text-rose-100">{e.name}</div>
                <div className="text-sm text-rose-200/70">HP {e.hp}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900/40 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2 md:gap-3">
          {(["Attack", "Defend", "Ability", "Item"] as const).map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function GamePage({ params }: GamePageProps) {
  const { sessionId } = await params;

  let session;
  let rows;
  try {
    session = await fetchSessionById(sessionId);
    rows = await fetchPlayerRowsForSession(sessionId);
  } catch {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <p className="text-zinc-400">Could not load this game session.</p>
        <Link
          href="/"
          className="mt-4 text-sm text-violet-400 underline hover:text-violet-300"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (!session || rows.length === 0) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <p className="text-zinc-400">
          Session not found or no party in this game.
        </p>
        <Link
          href="/"
          className="mt-4 text-sm text-violet-400 underline hover:text-violet-300"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const gameState = createInitialGameState(rows);

  return <GameShell gameState={gameState} />;
}
