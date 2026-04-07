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
    <section className="flex w-full max-w-xl items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-rose-400/70 bg-rose-950/30 p-8 text-center shadow-[0_0_80px_rgba(244,63,94,0.25)] backdrop-blur-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
          Encounter Target
        </p>
        <p className="mt-3 text-3xl font-semibold text-rose-100 md:text-4xl">
          {enemy.name}
        </p>
        <p className="mt-3 text-lg text-rose-100/90">HP {enemy.hp}</p>
        <p className="mt-2 text-xs uppercase tracking-wider text-rose-200/70">
          Drifting in the center of the hall
        </p>
      </div>
    </section>
  );
}
