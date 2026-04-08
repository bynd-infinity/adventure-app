import type { Enemy, EnemyBehavior, EnemyTraitTag } from "@/types";

/** Template definitions — not full instances; use spawn helpers for runtime enemies. */
export type EnemyTemplate = {
  id: string;
  name: string;
  maxHp: number;
  baseDamage: number;
  behavior: EnemyBehavior;
  /** Optional hints for which rooms favor this foe (documentation / filtering). */
  roomTags?: string[];
  roleLabel?: string;
  traitLabel?: string;
  traitTag?: EnemyTraitTag;
};

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  restless_spirit: {
    id: "restless_spirit",
    name: "Restless Spirit",
    maxHp: 10,
    baseDamage: 4,
    behavior: "fragile",
    roomTags: ["entrance_hall", "light", "ghost"],
    roleLabel: "Drifting specter",
    traitLabel: "Spectral",
    traitTag: "spectral",
  },
  cursed_doll: {
    id: "cursed_doll",
    name: "Cursed Doll",
    maxHp: 9,
    baseDamage: 7,
    behavior: "aggressive",
    roomTags: ["dining_room", "curse", "ambush"],
    roleLabel: "Porcelain malice",
    traitLabel: "Aggressive",
    traitTag: "mundane",
  },
  shadow_figure: {
    id: "shadow_figure",
    name: "Shadow Figure",
    maxHp: 8,
    baseDamage: 5,
    behavior: "fragile",
    roomTags: ["library", "ghost", "knowledge"],
    roleLabel: "A silhouette with no face",
    traitLabel: "Spectral",
    traitTag: "spectral",
  },
  portrait_sentry: {
    id: "portrait_sentry",
    name: "Portrait Sentry",
    maxHp: 11,
    baseDamage: 6,
    behavior: "defensive",
    roomTags: ["registry_gallery", "watcher"],
    roleLabel: "Frame-bound watcher",
    traitLabel: "Defensive",
    traitTag: "spectral",
  },
  service_lurker: {
    id: "service_lurker",
    name: "Service Lurker",
    maxHp: 10,
    baseDamage: 7,
    behavior: "aggressive",
    roomTags: ["servants_corridor", "ambush"],
    roleLabel: "Back-hall hunter",
    traitLabel: "Aggressive",
    traitTag: "mundane",
  },
  possessed_armor: {
    id: "possessed_armor",
    name: "Possessed Armor",
    maxHp: 16,
    baseDamage: 6,
    behavior: "defensive",
    roomTags: ["dining_room", "mixed"],
    roleLabel: "Empty steel that still swings",
    traitLabel: "Defensive",
    traitTag: "mundane",
  },
  bound_spirit: {
    id: "bound_spirit",
    name: "Bound Spirit",
    maxHp: 30,
    baseDamage: 11,
    behavior: "boss",
    roomTags: ["boss_room"],
    roleLabel: "The heart of the haunting",
    traitLabel: "Spectral",
    traitTag: "spectral",
  },
};

export type EncounterRoomId =
  | "entrance_hall"
  | "registry_gallery"
  | "library"
  | "servants_corridor"
  | "dining_room"
  | "boss_room";

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function spawnFromTemplate(templateKey: string, instanceKey: string): Enemy {
  const t = ENEMY_TEMPLATES[templateKey];
  if (!t) {
    throw new Error(`Unknown enemy template: ${templateKey}`);
  }
  return {
    id: `${instanceKey}-${t.id}`,
    name: t.name,
    hp: t.maxHp,
    maxHp: t.maxHp,
    behavior: t.behavior,
    baseDamage: t.baseDamage,
    templateId: t.id,
    roleLabel: t.roleLabel,
    traitLabel: t.traitLabel,
    traitTag: t.traitTag,
  };
}

/** Modifies the attack roll before hit tiers (fragile: wilder misses; boss: steadier hits). */
export function enemyAttackRollModifier(behavior: EnemyBehavior): number {
  switch (behavior) {
    case "aggressive":
      return 1;
    case "fragile":
      /** Penalty moved to disadvantage on the attack roll (two d20, keep lower). */
      return 0;
    case "defensive":
      return 0;
    case "boss":
      return 2;
    default:
      return 0;
  }
}

export function enemyAttackUsesDisadvantage(behavior: EnemyBehavior): boolean {
  return behavior === "fragile";
}

/** Defensive foes shrug a little damage; others take full amount. */
export function applyIncomingDamageToEnemy(enemy: Enemy, rawDamage: number): number {
  if (enemy.behavior === "defensive") {
    return Math.max(0, rawDamage - 2);
  }
  return rawDamage;
}

/** Simple targeting: aggressive finishes the weak; defensive probes the sturdy. */
export function pickEnemyTargetPlayerIndex(
  players: { hp: number; name: string }[],
  behavior: EnemyBehavior,
): number | null {
  const indices: number[] = [];
  for (let i = 0; i < players.length; i++) {
    if (players[i]!.hp > 0) indices.push(i);
  }
  if (indices.length === 0) return null;

  if (behavior === "aggressive") {
    let best = indices[0]!;
    for (const i of indices) {
      if (players[i]!.hp < players[best]!.hp) best = i;
    }
    return best;
  }

  if (behavior === "defensive") {
    let best = indices[0]!;
    for (const i of indices) {
      if (players[i]!.hp > players[best]!.hp) best = i;
    }
    return best;
  }

  return indices[0]!;
}

/**
 * Room-based encounter: regular rooms get 1–2 foes; boss room is always Bound Spirit.
 */
export function generateEncounter(room: EncounterRoomId): Enemy[] {
  const key = randomId();

  if (room === "boss_room") {
    return [spawnFromTemplate("bound_spirit", `boss-${key}`)];
  }

  const entrancePool = ["restless_spirit", "shadow_figure"] as const;
  const registryPool = ["portrait_sentry", "restless_spirit"] as const;
  const libraryPool = ["shadow_figure", "restless_spirit", "cursed_doll"] as const;
  const servantsPool = ["service_lurker", "cursed_doll", "shadow_figure"] as const;
  const diningPool = ["cursed_doll", "possessed_armor", "restless_spirit"] as const;

  const pool =
    room === "entrance_hall"
      ? entrancePool
      : room === "registry_gallery"
        ? registryPool
      : room === "library"
        ? libraryPool
        : room === "servants_corridor"
          ? servantsPool
        : diningPool;

  const twoEnemies = Math.random() < 0.42;

  if (!twoEnemies || pool.length < 2) {
    return [spawnFromTemplate(pickRandom(pool), `${room}-a-${key}`)];
  }

  const first = pickRandom(pool);
  const remaining = pool.filter((id) => id !== first);
  const second = remaining.length > 0 ? pickRandom(remaining) : pickRandom(pool);

  return [
    spawnFromTemplate(first, `${room}-a-${key}`),
    spawnFromTemplate(second, `${room}-b-${key}`),
  ];
}
