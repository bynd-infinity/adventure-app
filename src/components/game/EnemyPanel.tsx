import type { Enemy } from "@/types";

type EnemyPanelProps = {
  enemies: Enemy[];
};

export function EnemyPanel({ enemies }: EnemyPanelProps) {
  return (
    <section className="flex flex-col rounded-lg border border-rose-900/40 bg-zinc-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rose-400">
        Foes
      </h2>
      <ul className="flex flex-col gap-2">
        {enemies.map((e) => (
          <li
            key={e.id}
            className="rounded-md border border-rose-900/50 bg-rose-950/20 px-3 py-2"
          >
            <div className="font-medium text-rose-100">{e.name}</div>
            <div className="text-sm text-rose-200/70">HP {e.hp}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
