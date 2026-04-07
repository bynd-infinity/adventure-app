import type { Enemy } from "@/types";

type EnemyPanelProps = {
  enemies: Enemy[];
  /** Increments when a new encounter begins; drives one-shot entrance animations. */
  encounterAnimGeneration: number;
};

function enemyEntranceClasses(
  enemy: Enemy,
  emphasis: "primary" | "secondary" | "boss",
): string {
  if (emphasis === "boss" || enemy.behavior === "boss") {
    return "enemy-entrance enemy-entrance--boss";
  }
  if (enemy.traitTag === "spectral") {
    return "enemy-entrance enemy-entrance--spectral";
  }
  if (enemy.behavior === "aggressive") {
    return "enemy-entrance enemy-entrance--aggressive";
  }
  if (enemy.behavior === "defensive") {
    return "enemy-entrance enemy-entrance--defensive";
  }
  return "enemy-entrance enemy-entrance--default";
}

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

  const entrance = enemyEntranceClasses(enemy, emphasis);
  const stagger =
    emphasis === "secondary" ? " enemy-entrance--stagger" : "";

  return (
    <div
      className={`w-full rounded-2xl border bg-rose-950/30 p-6 text-center backdrop-blur-sm md:p-8 ${border} ${
        isBoss ? "ring-2 ring-amber-500/40" : ""
      } ${entrance}${stagger}`}
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

export function EnemyPanel({ enemies, encounterAnimGeneration }: EnemyPanelProps) {
  const living = enemies.filter((e) => e.hp > 0);
  if (living.length === 0) {
    return null;
  }

  const hasBoss = living.some((e) => e.behavior === "boss");
  const primary = living[0]!;
  const secondary = living[1];

  const gen = encounterAnimGeneration;

  if (living.length === 1) {
    return (
      <section className="flex w-full max-w-xl items-center justify-center px-4">
        <EnemyCard
          key={`${primary.id}-${gen}`}
          enemy={primary}
          emphasis={hasBoss ? "boss" : "primary"}
        />
      </section>
    );
  }

  return (
    <section className="flex w-full max-w-4xl flex-col items-stretch justify-center gap-4 px-4 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <EnemyCard
          key={`${primary.id}-${gen}`}
          enemy={primary}
          emphasis="primary"
        />
      </div>
      <div className="min-w-0 flex-1 md:pt-6">
        <EnemyCard
          key={`${secondary!.id}-${gen}`}
          enemy={secondary!}
          emphasis="secondary"
        />
      </div>
    </section>
  );
}
