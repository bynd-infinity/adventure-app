import type { Enemy, EnemyBehavior } from "@/types";

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
  },
  cursed_doll: {
    id: "cursed_doll",
    name: "Cursed Doll",
    maxHp: 9,
    baseDamage: 7,
    behavior: "aggressive",
    roomTags: ["dining_room", "curse", "ambush"],
    roleLabel: "Porcelain malice",
  },
  shadow_figure: {
    id: "shadow_figure",
    name: "Shadow Figure",
    maxHp: 8,
    baseDamage: 5,
    behavior: "fragile",
    roomTags: ["library", "ghost", "knowledge"],
    roleLabel: "A silhouette with no face",
  },
  possessed_armor: {
    id: "possessed_armor",
    name: "Possessed Armor",
    maxHp: 16,
    baseDamage: 6,
    behavior: "defensive",
    roomTags: ["dining_room", "mixed"],
    roleLabel: "Empty steel that still swings",
  },
  bound_spirit: {
    id: "bound_spirit",
    name: "Bound Spirit",
    maxHp: 30,
    baseDamage: 11,
    behavior: "boss",
    roomTags: ["boss_room"],
    roleLabel: "The heart of the haunting",
  },
};

export type EncounterRoomId =
  | "entrance_hall"
  | "library"
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
  };
}

/** Modifies the attack roll before hit tiers (fragile: wilder misses; boss: steadier hits). */
export function enemyAttackRollModifier(behavior: EnemyBehavior): number {
  switch (behavior) {
    case "aggressive":
      return 1;
    case "fragile":
      return -1;
    case "defensive":
      return 0;
    case "boss":
      return 2;
    default:
      return 0;
  }
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
  const libraryPool = ["shadow_figure", "restless_spirit", "cursed_doll"] as const;
  const diningPool = ["cursed_doll", "possessed_armor", "restless_spirit"] as const;

  const pool =
    room === "entrance_hall"
      ? entrancePool
      : room === "library"
        ? libraryPool
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
