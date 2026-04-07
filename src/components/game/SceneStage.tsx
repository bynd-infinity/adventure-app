import { sceneDisplayName } from "@/lib/game/sceneDisplay";

type SceneStageProps = {
  scene: string;
  narrationLog: string[];
};

export function SceneStage({ scene, narrationLog }: SceneStageProps) {
  return (
    <section className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 md:bottom-28">
      <div className="w-full max-w-2xl rounded-lg border border-violet-800/60 bg-zinc-950/70 p-4 text-center shadow-lg backdrop-blur-sm">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
          Scene
        </span>
        <p className="mt-2 text-lg font-medium text-violet-100">
          {sceneDisplayName(scene)}
        </p>
        <div className="mt-2 space-y-1 text-left">
          {narrationLog.map((line, idx) => (
            <p key={`${idx}-${line}`} className="text-sm text-zinc-300">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
