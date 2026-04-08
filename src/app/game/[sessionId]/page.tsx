import Link from "next/link";
import { GameRuntime } from "@/components/game/GameRuntime";
import { createInitialGameState } from "@/lib/game/createGameState";
import { fetchPlayerRowsForSession } from "@/lib/lobby/players";
import { fetchSessionById } from "@/lib/lobby/session";

type GamePageProps = {
  params: Promise<{ sessionId: string }>;
};

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

  return <GameRuntime initialGameState={gameState} sessionId={sessionId} />;
}
