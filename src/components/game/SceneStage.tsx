import { sceneDisplayName } from "@/lib/game/sceneDisplay";

type SceneStageProps = {
  scene: string;
};

export function SceneStage({ scene }: SceneStageProps) {
  return (
    <section className="flex min-h-[200px] flex-col rounded-lg border-2 border-dashed border-violet-800/60 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 md:min-h-[280px]">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">
        Scene
      </span>
      <div className="mt-4 flex flex-1 items-center justify-center text-center">
        <p className="text-lg font-medium text-violet-100/90">
          {sceneDisplayName(scene)}
        </p>
      </div>
      <p className="mt-auto text-center text-xs text-zinc-500">
        Cold air drifts through the hall. Something stirs in the shadows.
      </p>
    </section>
  );
}
