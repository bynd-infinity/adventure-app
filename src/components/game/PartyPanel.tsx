import { characterPortraitSrc } from "@/config/characters";

type PartyPanelProps = {
  players: Array<{
    id: string;
    name: string;
    class: string;
    hp: number;
    maxHp: number;
  }>;
  activePlayerId: string | null;
};

export function PartyPanel({ players, activePlayerId }: PartyPanelProps) {
  return (
    <section className="absolute left-3 top-16 z-20 w-[11.5rem] rounded-md border border-violet-900/40 bg-zinc-950/55 p-2.5 shadow-md backdrop-blur-sm md:left-5 md:top-20 md:w-52">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/90">
        Party
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((p) => {
          const isActive = activePlayerId === p.id;
          const isDefeated = p.hp <= 0;
          const portrait = characterPortraitSrc(p.class);
          return (
            <li
              key={p.id}
              className={`rounded border px-2 py-1.5 ${
                isDefeated
                  ? "border-zinc-800/70 bg-zinc-900/20 opacity-45"
                  : isActive
                    ? "border-amber-500/80 bg-amber-950/35 ring-1 ring-amber-500/30"
                    : "border-zinc-700/70 bg-zinc-950/45"
              }`}
            >
              <div className="flex items-end gap-2">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900/80 ring-1 ring-zinc-700/50">
                  {portrait ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local static portraits from /public
                    <img
                      src={portrait}
                      alt=""
                      className="h-full w-full object-contain object-bottom"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-100">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {p.class || "—"} · HP {p.hp}/{p.maxHp}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
