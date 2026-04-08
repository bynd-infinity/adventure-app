type SceneStageProps = {
  narrationLog: string[];
  /** Active hero portrait during combat (from /public/characters). */
  portraitSrc?: string | null;
  portraitAlt?: string;
};

export function SceneStage({
  narrationLog,
  portraitSrc,
  portraitAlt,
}: SceneStageProps) {
  return (
    <section className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 md:bottom-28">
      <div className="flex w-full max-w-3xl gap-3 rounded-lg border border-zinc-700/70 bg-zinc-950/70 p-3 shadow-lg backdrop-blur-sm">
        {portraitSrc ? (
          <div className="hidden w-[4.5rem] shrink-0 sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
            <img
              src={portraitSrc}
              alt={portraitAlt ?? "Hero"}
              className="mx-auto h-[5.5rem] w-full object-contain object-bottom drop-shadow-[0_0_12px_rgba(0,0,0,0.6)]"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Combat Record
          </p>
          <div className="mt-2 space-y-1">
            {narrationLog.map((line, idx) => (
              <p key={`${idx}-${line}`} className="text-sm text-zinc-200">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
