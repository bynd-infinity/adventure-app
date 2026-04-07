import type { Enemy } from "@/types";

type EnemyPanelProps = {
  enemies: Enemy[];
};

export function EnemyPanel({ enemies }: EnemyPanelProps) {
  const enemy = enemies[0];

  if (!enemy) {
    return null;
  }

  return (
    <section className="flex w-full max-w-sm items-center justify-center px-4">
      <div className="w-full rounded-xl border border-rose-500/60 bg-rose-950/25 p-6 text-center shadow-[0_0_40px_rgba(244,63,94,0.2)] backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">Enemy</p>
        <p className="mt-2 text-2xl font-semibold text-rose-100">{enemy.name}</p>
        <p className="mt-2 text-base text-rose-200/80">HP {enemy.hp}</p>
      </div>
    </section>
  );
}
