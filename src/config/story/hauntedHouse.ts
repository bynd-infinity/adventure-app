import type { StoryBundle, StoryEffect } from "@/lib/story/types";

/** Meta-villain lines: use as effects or via `applyStandaloneMetaEffects` at runtime. */
export const metaVillainEffects = {
  entranceFirstChoice: {
    type: "meta_message" as const,
    text: "Interesting.",
    onceKey: "entrance_first_meaningful_choice",
  },
  afterFirstCombatWin: {
    type: "meta_message" as const,
    text: "You learn quickly.",
    onceKey: "first_combat_victory",
  },
  beforeBossRoom: {
    type: "meta_message" as const,
    text: "I shaped every threshold you crossed.",
    onceKey: "before_boss_room",
  },
  /** Shown when entering the boss room after discovering the letter fragment. */
  bossLetterReveal: {
    type: "meta_message" as const,
    text: "You read what I left for you—good.",
    onceKey: "boss_enter_with_letter",
  },
  afterFirstReward: {
    type: "meta_message" as const,
    text: "A small favor; savor it.",
    onceKey: "after_first_reward",
  },
  entranceCleared: {
    type: "meta_message" as const,
    text: "The foyer was only the first whisper.",
    onceKey: "entrance_cleared_meta",
  },
  readFragment: {
    type: "meta_message" as const,
    text: "That name was always meant to find you.",
    onceKey: "read_letter_fragment_meta",
  },
} satisfies Record<string, StoryEffect>;

/**
 * Haunted house — Entrance Hall branch (data-driven).
 * Other wings remain hardcoded in GameRuntime until migrated.
 */
export const hauntedHouseEntrance: StoryBundle = {
  initialSceneId: "eh_intro",
  scenes: {
    eh_intro: {
      id: "eh_intro",
      type: "intro",
      roomTitle: "Entrance Hall",
      text: "A dying chandelier swings overhead as the haunted house exhales.",
      nextSceneId: "eh_hub",
    },
    eh_hub: {
      id: "eh_hub",
      type: "action",
      text: "The hall waits. Use Search, Inspect, or Listen to probe the room; leave only when you have learned enough.",
    },
    eh_doorway_peek: {
      id: "eh_doorway_peek",
      type: "result",
      title: "A moment passes",
      text: "The room still breathes around you. There is more to uncover.",
      cta: "Continue Exploring",
      resultNext: "explore_more",
    },
  },
};
