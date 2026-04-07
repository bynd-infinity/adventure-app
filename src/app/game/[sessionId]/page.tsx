import Link from "next/link";
import { ActionBar } from "@/components/game/ActionBar";
import { EnemyPanel } from "@/components/game/EnemyPanel";
import { GameTopBar } from "@/components/game/GameTopBar";
import { PartyPanel } from "@/components/game/PartyPanel";
import { SceneStage } from "@/components/game/SceneStage";
import { createInitialGameState } from "@/lib/game/createGameState";
import { fetchPlayerRowsForSession } from "@/lib/lobby/players";
import { fetchSessionById } from "@/lib/lobby/session";
import type { GameState } from "@/types";

type GamePageProps = {
  params: Promise<{ sessionId: string }>;
};

function GameShell({ gameState }: { gameState: GameState }) {
  const activePlayer =
    gameState.players.length > 0
      ? gameState.players[
          gameState.turnIndex % gameState.players.length
        ]!
      : null;

  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-zinc-950 bg-cover bg-center bg-no-repeat bg-[url('/backgrounds/entrance-hall.png')] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-black/60"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <GameTopBar scene={gameState.scene} />

        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-3 md:gap-6 md:p-6">
          <PartyPanel
            players={gameState.players}
            activePlayerId={activePlayer?.id ?? null}
          />
          <SceneStage scene={gameState.scene} />
          <EnemyPanel enemies={gameState.enemies} />
        </div>

        <ActionBar />
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
