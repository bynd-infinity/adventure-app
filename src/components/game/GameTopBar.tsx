import { sceneDisplayName } from "@/lib/game/sceneDisplay";

type GameTopBarProps = {
  scene: string;
};

export function GameTopBar({ scene }: GameTopBarProps) {
  return (
    <header className="border-b border-violet-950/80 bg-zinc-900/80 px-6 py-4">
      <h1 className="text-center text-xl font-semibold tracking-tight text-violet-100 md:text-2xl">
        Haunted House — {sceneDisplayName(scene)}
      </h1>
    </header>
  );
}
