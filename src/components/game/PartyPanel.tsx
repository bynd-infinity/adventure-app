import type { Player } from "@/types";

type PartyPanelProps = {
  players: Player[];
  activePlayerId: string | null;
};

export function PartyPanel({ players, activePlayerId }: PartyPanelProps) {
  return (
    <section className="absolute left-3 top-16 z-20 w-44 rounded-md border border-violet-900/40 bg-zinc-950/55 p-2.5 shadow-md backdrop-blur-sm md:left-5 md:top-20">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/90">
        Party
      </h2>
      <ul className="flex flex-col gap-1">
        {players.map((p) => {
          const isActive = activePlayerId === p.id;
          const isDefeated = p.hp <= 0;
          return (
            <li
              key={p.id}
              className={`rounded border px-2 py-1 ${
                isDefeated
                  ? "border-zinc-800/70 bg-zinc-900/20 opacity-45"
                  : isActive
                  ? "border-amber-500/80 bg-amber-950/35 ring-1 ring-amber-500/30"
                  : "border-zinc-700/70 bg-zinc-950/45"
              }`}
            >
              <div className="truncate text-xs font-medium text-zinc-100">
                {p.name}
              </div>
              <div className="text-[11px] text-zinc-400">
                {p.class || "—"} · HP {p.hp}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
