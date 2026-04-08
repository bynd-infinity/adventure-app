import type { Enemy } from "@/types";

type EnemyPanelProps = {
  enemies: Enemy[];
  /** Increments when a new encounter begins; drives one-shot entrance animations. */
  encounterAnimGeneration: number;
  hitEnemyId?: string | null;
  hitKind?: "miss" | "hit" | "strong" | "critical" | null;
  /** Compact top-right stack for Pokémon-style battle arena. */
  layout?: "default" | "arena";
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
  hitKind,
  arena,
}: {
  enemy: Enemy;
  emphasis: "primary" | "secondary" | "boss";
  hitKind?: "miss" | "hit" | "strong" | "critical" | null;
  arena?: boolean;
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

  const arenaHostile =
    arena && hitKind
      ? `enemy-arena-recoil enemy-arena-recoil--${hitKind}`
      : arena
        ? `enemy-arena-idle enemy-arena-idle--${enemy.traitTag ?? "mundane"} enemy-arena-idle--${enemy.behavior}`
        : "";

  return (
    <div
      className={`w-full rounded-2xl border bg-rose-950/30 text-center backdrop-blur-sm ${
        arena ? "max-w-[14rem] p-3 md:max-w-[16rem] md:p-4" : "p-6 md:p-8"
      } ${border} ${
        isBoss ? "ring-2 ring-amber-500/40" : ""
      } ${entrance}${stagger} ${arenaHostile} ${
        hitKind === "critical"
          ? "combat-impact-critical"
          : hitKind === "strong"
            ? "combat-impact-strong"
            : hitKind === "hit"
              ? "combat-impact-hit"
              : hitKind === "miss"
                ? "combat-impact-miss"
                : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">
        {isBoss ? "Final confrontation" : emphasis === "primary" ? "Encounter target" : "Also present"}
      </p>
      <p
        className={`mt-3 font-semibold text-rose-100 ${
          isBoss
            ? arena
              ? "text-2xl md:text-3xl"
              : "text-4xl md:text-5xl"
            : arena
              ? "text-lg md:text-xl"
              : "text-2xl md:text-3xl"
        }`}
      >
        {enemy.name}
      </p>
      {enemy.spriteSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- local static enemy art
        <img
          src={enemy.spriteSrc}
          alt=""
          className={`mx-auto mt-3 object-contain ${
            arena ? `enemy-arena-sprite enemy-arena-sprite--${enemy.templateId} ` : ""
          }${
            isBoss
              ? arena
                ? "h-32 w-32 md:h-36 md:w-36"
                : "h-44 w-44 md:h-52 md:w-52"
              : arena
                ? "h-24 w-24 md:h-28 md:w-28"
                : "h-28 w-28 md:h-32 md:w-32"
          }`}
        />
      ) : null}
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

export function EnemyPanel({
  enemies,
  encounterAnimGeneration,
  hitEnemyId = null,
  hitKind = null,
  layout = "default",
}: EnemyPanelProps) {
  const living = enemies.filter((e) => e.hp > 0);
  if (living.length === 0) {
    return null;
  }

  const arena = layout === "arena";
  const hasBoss = living.some((e) => e.behavior === "boss");
  const primary = living[0]!;
  const secondary = living[1];

  const gen = encounterAnimGeneration;

  if (living.length === 1) {
    return (
      <section
        className={
          arena
            ? "flex w-full max-w-md items-start justify-end px-2"
            : "flex w-full max-w-xl items-center justify-center px-4"
        }
      >
        <EnemyCard
          key={`${primary.id}-${gen}`}
          enemy={primary}
          emphasis={hasBoss ? "boss" : "primary"}
          hitKind={primary.id === hitEnemyId ? hitKind : null}
          arena={arena}
        />
      </section>
    );
  }

  return (
    <section
      className={
        arena
          ? "flex w-full max-w-2xl flex-row items-start justify-end gap-2 px-2 md:gap-3"
          : "flex w-full max-w-4xl flex-col items-stretch justify-center gap-4 px-4 md:flex-row md:items-start"
      }
    >
      <div className={arena ? "min-w-0" : "min-w-0 flex-1"}>
        <EnemyCard
          key={`${primary.id}-${gen}`}
          enemy={primary}
          emphasis="primary"
          hitKind={primary.id === hitEnemyId ? hitKind : null}
          arena={arena}
        />
      </div>
      <div className={arena ? "min-w-0 pt-4 md:pt-8" : "min-w-0 flex-1 md:pt-6"}>
        <EnemyCard
          key={`${secondary!.id}-${gen}`}
          enemy={secondary!}
          emphasis="secondary"
          hitKind={secondary!.id === hitEnemyId ? hitKind : null}
          arena={arena}
        />
      </div>
    </section>
  );
}
