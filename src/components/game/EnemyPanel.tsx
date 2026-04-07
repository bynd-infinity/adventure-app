import type { Enemy } from "@/types";

type EnemyPanelProps = {
  enemies: Enemy[];
};

function EnemyCard({
  enemy,
  emphasis,
}: {
  enemy: Enemy;
  emphasis: "primary" | "secondary" | "boss";
}) {
  const isBoss = emphasis === "boss";
  const border =
    emphasis === "boss"
      ? "border-amber-400/80 shadow-[0_0_100px_rgba(251,191,36,0.35)]"
      : emphasis === "primary"
        ? "border-rose-400/70 shadow-[0_0_80px_rgba(244,63,94,0.25)]"
        : "border-rose-500/50 shadow-[0_0_40px_rgba(244,63,94,0.15)]";

  return (
    <div
      className={`w-full rounded-2xl border bg-rose-950/30 p-6 text-center backdrop-blur-sm md:p-8 ${border} ${
        isBoss ? "ring-2 ring-amber-500/40" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
        {isBoss ? "Final confrontation" : emphasis === "primary" ? "Encounter target" : "Also present"}
      </p>
      <p
        className={`mt-3 font-semibold text-rose-100 ${
          isBoss ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"
        }`}
      >
        {enemy.name}
      </p>
      <p className="mt-3 text-lg text-rose-100/90">
        HP {enemy.hp}/{enemy.maxHp}
      </p>
      {enemy.roleLabel ? (
        <p className="mt-2 text-xs uppercase tracking-wider text-rose-200/70">
          {enemy.roleLabel}
        </p>
      ) : null}
      {enemy.traitLabel ? (
        <p className="mt-1 text-[11px] font-medium tracking-wide text-amber-200/75">
          {enemy.traitLabel}
        </p>
      ) : null}
    </div>
  );
}

export function EnemyPanel({ enemies }: EnemyPanelProps) {
  const living = enemies.filter((e) => e.hp > 0);
  if (living.length === 0) {
    return null;
  }

  const hasBoss = living.some((e) => e.behavior === "boss");
  const primary = living[0]!;
  const secondary = living[1];

  if (living.length === 1) {
    return (
      <section className="flex w-full max-w-xl items-center justify-center px-4">
        <EnemyCard enemy={primary} emphasis={hasBoss ? "boss" : "primary"} />
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-4xl flex-col items-stretch justify-center gap-4 px-4 md:flex-row md:items-start">
      <div className="flex-1 min-w-0">
        <EnemyCard enemy={primary} emphasis="primary" />
      </div>
      <div className="flex-1 min-w-0 md:pt-6">
        <EnemyCard enemy={secondary!} emphasis="secondary" />
      </div>
    </section>
  );
}
