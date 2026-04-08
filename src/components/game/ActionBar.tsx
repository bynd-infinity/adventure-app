type ActionBarProps = {
  onAttack: () => void;
  attackDisabled?: boolean;
  tonicCount: number;
  balmCount: number;
  onUseTonic: () => void;
  onUseBalm: () => void;
  tonicDisabled?: boolean;
  balmDisabled?: boolean;
};

export function ActionBar({
  onAttack,
  attackDisabled = false,
  tonicCount,
  balmCount,
  onUseTonic,
  onUseBalm,
  tonicDisabled = true,
  balmDisabled = true,
}: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-700/60 bg-zinc-950/80 px-4 py-4 backdrop-blur-sm md:px-6">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        <button
          type="button"
          onClick={onAttack}
          disabled={attackDisabled}
          className="rounded-lg border border-rose-400/70 bg-rose-900/40 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-rose-100 transition hover:bg-rose-800/50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Attack
        </button>
        <button
          type="button"
          onClick={onUseTonic}
          disabled={tonicDisabled}
          className="rounded-lg border border-emerald-700/60 bg-emerald-950/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100/95 transition hover:bg-emerald-900/45 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Tonic ({tonicCount})
        </button>
        <button
          type="button"
          onClick={onUseBalm}
          disabled={balmDisabled}
          className="rounded-lg border border-violet-700/55 bg-violet-950/45 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-100/95 transition hover:bg-violet-900/45 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Balm ({balmCount})
        </button>
        <div className="hidden items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-2 text-[10px] uppercase tracking-wide text-zinc-500 sm:flex">
          Defend / Ability soon
        </div>
      </div>
    </div>
  );
}
