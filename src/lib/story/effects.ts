import type { RoomId } from "./rooms";
import type { StoryEffect, StoryResultNext } from "./types";

export type ResultCardPayload = {
  title: string;
  message: string;
  cta: string;
  next: StoryResultNext;
};

export type EffectProcessContext = {
  /** After incrementing interaction count for this choice. */
  canExitRoom: boolean;
  /** When set, meta_message effects with onceKey skip if key already present. */
  usedMetaOnceKeys?: Set<string>;
};

export type ProcessedStoryEffects = {
  damageFirstLiving: number;
  healFirstLiving: number;
  clueIds: string[];
  combat: { room: RoomId; resumeSceneId: string } | null;
  grantReward: {
    markRoomComplete?: RoomId;
    completionCard: ResultCardPayload;
  } | null;
  /** When set, show result overlay (explore / pacing) without reward. */
  navigateToSceneId: string | null;
  /** Latest meta line from this effect chain (for UI). */
  metaMessage: string | null;
  /** Keys to set true on the runtime flag store. */
  flagSets: string[];
  /** Keys to remove from the flag store. */
  flagClears: string[];
};

const empty = (): ProcessedStoryEffects => ({
  damageFirstLiving: 0,
  healFirstLiving: 0,
  clueIds: [],
  combat: null,
  grantReward: null,
  navigateToSceneId: null,
  metaMessage: null,
  flagSets: [],
  flagClears: [],
});

function mergeProcessed(
  a: ProcessedStoryEffects,
  b: ProcessedStoryEffects,
): ProcessedStoryEffects {
  return {
    damageFirstLiving: a.damageFirstLiving + b.damageFirstLiving,
    healFirstLiving: a.healFirstLiving + b.healFirstLiving,
    clueIds: [...a.clueIds, ...b.clueIds],
    combat: b.combat ?? a.combat,
    grantReward: b.grantReward ?? a.grantReward,
    navigateToSceneId: b.navigateToSceneId ?? a.navigateToSceneId,
    metaMessage: b.metaMessage != null ? b.metaMessage : a.metaMessage,
    flagSets: [...a.flagSets, ...b.flagSets],
    flagClears: [...a.flagClears, ...b.flagClears],
  };
}

function applyMetaMessage(
  effect: { text: string; onceKey?: string },
  ctx: EffectProcessContext,
): string | null {
  if (effect.onceKey && ctx.usedMetaOnceKeys) {
    if (ctx.usedMetaOnceKeys.has(effect.onceKey)) return null;
    ctx.usedMetaOnceKeys.add(effect.onceKey);
  }
  return effect.text;
}

/**
 * Applies story effects in order. Combat or grant_reward stops further navigation
 * from the same choice (handled by runtime).
 */
export function processStoryEffects(
  effects: StoryEffect[] | undefined,
  ctx: EffectProcessContext,
): ProcessedStoryEffects {
  if (!effects?.length) {
    return empty();
  }

  let acc = empty();

  for (const effect of effects) {
    if (effect.type === "meta_message") {
      const line = applyMetaMessage(effect, ctx);
      if (line) {
        acc = mergeProcessed(acc, { ...empty(), metaMessage: line });
      }
      continue;
    }

    if (effect.type === "branch_if") {
      if (effect.condition !== "room_can_exit") {
        continue;
      }
      if (ctx.canExitRoom) {
        const inner = processStoryEffects(effect.thenEffects, ctx);
        acc = mergeProcessed(acc, inner);
      } else {
        const elseAcc = effect.elseEffects?.length
          ? processStoryEffects(effect.elseEffects, ctx)
          : empty();
        acc = mergeProcessed(acc, elseAcc);
        acc = mergeProcessed(acc, {
          ...empty(),
          navigateToSceneId: effect.elseSceneId,
        });
      }
      continue;
    }

    if (acc.navigateToSceneId || acc.combat || acc.grantReward) {
      break;
    }

    switch (effect.type) {
      case "set_flag":
        acc = mergeProcessed(acc, {
          ...empty(),
          flagSets: [effect.key],
        });
        break;
      case "clear_flag":
        acc = mergeProcessed(acc, {
          ...empty(),
          flagClears: [effect.key],
        });
        break;
      case "damage_player":
        acc = mergeProcessed(acc, {
          ...empty(),
          damageFirstLiving: effect.amount,
        });
        break;
      case "heal_player":
        acc = mergeProcessed(acc, {
          ...empty(),
          healFirstLiving: effect.amount,
        });
        break;
      case "add_clue":
        acc = mergeProcessed(acc, {
          ...empty(),
          clueIds: [effect.clueId],
        });
        break;
      case "start_combat":
        acc = mergeProcessed(acc, {
          ...empty(),
          combat: { room: effect.room, resumeSceneId: effect.resumeSceneId },
        });
        break;
      case "grant_reward":
        acc = mergeProcessed(acc, {
          ...empty(),
          grantReward: {
            markRoomComplete: effect.markRoomComplete,
            completionCard: effect.completionCard,
          },
        });
        break;
      default:
        break;
    }
  }

  return acc;
}

/** Run only meta_message effects (flat list) for runtime hooks outside story choices. */
export function applyStandaloneMetaEffects(
  effects: StoryEffect[] | undefined,
  ctx: EffectProcessContext,
): string | null {
  if (!effects?.length) return null;
  let last: string | null = null;
  for (const effect of effects) {
    if (effect.type !== "meta_message") continue;
    const line = applyMetaMessage(effect, ctx);
    if (line) last = line;
  }
  return last;
}
