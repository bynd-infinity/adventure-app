const ACTIONS = ["Attack", "Defend", "Ability", "Item"] as const;

export function ActionBar() {
  return (
    <div className="border-t border-zinc-800 bg-zinc-900/40 px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2 md:gap-3">
        {ACTIONS.map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
