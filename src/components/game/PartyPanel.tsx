import type { Player } from "@/types";

type PartyPanelProps = {
  players: Player[];
  activePlayerId: string | null;
};

export function PartyPanel({ players, activePlayerId }: PartyPanelProps) {
  return (
    <section className="absolute left-4 top-16 z-20 w-52 rounded-lg border border-violet-900/50 bg-zinc-950/70 p-3 shadow-lg backdrop-blur-sm md:left-6 md:top-20">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
        Party
      </h2>
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => {
          const isActive = activePlayerId === p.id;
          const isDefeated = p.hp <= 0;
          return (
            <li
              key={p.id}
              className={`rounded border px-2 py-1.5 ${
                isDefeated
                  ? "border-zinc-800/80 bg-zinc-900/30 opacity-55"
                  : isActive
                  ? "border-amber-500/70 bg-amber-950/30"
                  : "border-zinc-700/80 bg-zinc-950/50"
              }`}
            >
              <div className="truncate text-sm font-medium text-zinc-100">
                {p.name}
              </div>
              <div className="text-xs text-zinc-400">{p.class || "—"} · HP {p.hp}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
