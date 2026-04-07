import { sceneDisplayName } from "@/lib/game/sceneDisplay";

type GameTopBarProps = {
  scene: string;
};

export function GameTopBar({ scene }: GameTopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 py-4 text-center md:px-6">
      <h1 className="inline-block rounded-md border border-violet-800/60 bg-zinc-950/65 px-4 py-1.5 text-sm font-semibold tracking-tight text-violet-100 shadow-lg md:text-base">
        Haunted House — {sceneDisplayName(scene)}
      </h1>
    </header>
  );
}
