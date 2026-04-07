const ACTIONS = ["Attack", "Defend", "Ability", "Item"] as const;

type ActionBarProps = {
  onAttack: () => void;
  attackDisabled?: boolean;
};

export function ActionBar({ onAttack, attackDisabled = false }: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-700/60 bg-zinc-950/75 px-4 py-4 backdrop-blur-sm md:px-6">
      <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 md:gap-3">
        {ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={label === "Attack" ? onAttack : undefined}
            disabled={label !== "Attack" || attackDisabled}
            className="rounded-lg border border-zinc-600 bg-zinc-800/90 px-5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
