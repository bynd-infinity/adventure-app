import type { GamePhase } from "@/types";
import { sceneDisplayName } from "@/lib/game/sceneDisplay";

type GameTopBarProps = {
  scene: string;
  phase: GamePhase;
};

export function GameTopBar({ scene, phase }: GameTopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 py-4 text-center md:px-6">
      <h1 className="phosphor-glow phosphor-glow-soft inline-block rounded-md border border-violet-800/60 bg-zinc-950/65 px-4 py-1.5 text-sm font-semibold tracking-tight text-violet-100 shadow-lg md:text-base">
        Haunted House — {sceneDisplayName(scene)} ·{" "}
        {phase === "enemy" ? "Enemy Phase" : "Player Phase"}
      </h1>
      <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Linked Party Session
      </p>
    </header>
  );
}
