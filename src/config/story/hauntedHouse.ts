import type { StoryBundle, StoryEffect } from "@/lib/story/types";

/** Meta-villain lines: use as effects or via `applyStandaloneMetaEffects` at runtime. */
export const metaVillainEffects = {
  entranceFirstChoice: {
    type: "meta_message" as const,
    text: "Good. You are paying attention.",
    onceKey: "entrance_first_meaningful_choice",
  },
  afterFirstCombatWin: {
    type: "meta_message" as const,
    text: "You hit hard when cornered.",
    onceKey: "first_combat_victory",
  },
  beforeBossRoom: {
    type: "meta_message" as const,
    text: "Every room was arranged for this.",
    onceKey: "before_boss_room",
  },
  /** Shown when entering the boss room after discovering the letter fragment. */
  bossLetterReveal: {
    type: "meta_message" as const,
    text: "You kept the fragment. Then you know whose house this is.",
    onceKey: "boss_enter_with_letter",
  },
  afterFirstReward: {
    type: "meta_message" as const,
    text: "Take it. You will need it.",
    onceKey: "after_first_reward",
  },
  entranceCleared: {
    type: "meta_message" as const,
    text: "The hall was an introduction, nothing more.",
    onceKey: "entrance_cleared_meta",
  },
  readFragment: {
    type: "meta_message" as const,
    text: "That name was meant to be read aloud.",
    onceKey: "read_letter_fragment_meta",
  },
  midpointReveal: {
    type: "meta_message" as const,
    text: "You finally saw it. This route was assigned, not discovered.",
    onceKey: "midpoint_reveal_meta",
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
      text: "The front doors shut behind you. The chandelier still moves.",
      nextSceneId: "eh_hub",
    },
    eh_hub: {
      id: "eh_hub",
      type: "action",
      text: "The entrance hall is wrong in small ways. Test it before you move on.",
    },
    eh_doorway_peek: {
      id: "eh_doorway_peek",
      type: "result",
      title: "Not finished",
      text: "You have seen part of it. Keep working the room.",
      cta: "Continue Exploring",
      resultNext: "explore_more",
    },
  },
};
