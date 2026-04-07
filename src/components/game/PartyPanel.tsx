import type { Player } from "@/types";

type PartyPanelProps = {
  players: Player[];
  activePlayerId: string | null;
};

export function PartyPanel({ players, activePlayerId }: PartyPanelProps) {
  return (
    <section className="flex flex-col rounded-lg border border-violet-900/50 bg-zinc-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-400">
        Party
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((p) => {
          const isActive = activePlayerId === p.id;
          return (
            <li
              key={p.id}
              className={`rounded-md border px-3 py-2 ${
                isActive
                  ? "border-amber-500/70 bg-amber-950/30 ring-1 ring-amber-600/40"
                  : "border-zinc-700/80 bg-zinc-950/50"
              }`}
            >
              <div className="font-medium text-zinc-100">{p.name}</div>
              <div className="text-sm text-zinc-400">
                {p.class || "—"} · HP {p.hp}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
