const ACTIONS = ["Attack", "Defend", "Ability", "Item"] as const;

type ActionBarProps = {
  onAttack: () => void;
  attackDisabled?: boolean;
};

export function ActionBar({ onAttack, attackDisabled = false }: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-700/60 bg-zinc-950/80 px-4 py-4 backdrop-blur-sm md:px-6">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2 md:gap-3">
        {ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={label === "Attack" ? onAttack : undefined}
            disabled={label !== "Attack" || attackDisabled}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold uppercase tracking-wide transition ${
              label === "Attack"
                ? "border-rose-400/70 bg-rose-900/40 text-rose-100 hover:bg-rose-800/50"
                : "border-zinc-700 bg-zinc-900/75 text-zinc-400"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
