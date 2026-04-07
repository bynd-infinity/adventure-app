type SceneStageProps = {
  narrationLog: string[];
};

export function SceneStage({ narrationLog }: SceneStageProps) {
  return (
    <section className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 md:bottom-28">
      <div className="w-full max-w-3xl rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-3 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Combat Log
        </p>
        <div className="mt-2 space-y-1">
          {narrationLog.map((line, idx) => (
            <p key={`${idx}-${line}`} className="text-sm text-zinc-200">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
