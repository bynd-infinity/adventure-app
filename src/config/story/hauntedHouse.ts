import type { StoryBundle, StoryEffect } from "@/lib/story/types";

/** Meta-villain lines: use as effects or via `applyStandaloneMetaEffects` at runtime. */
export const metaVillainEffects = {
  entranceFirstChoice: {
    type: "meta_message" as const,
    text: "The ledger notices when you touch something that matters.",
    onceKey: "entrance_first_meaningful_choice",
  },
  afterFirstCombatWin: {
    type: "meta_message" as const,
    text: "First blood proves you can hold a line. The house files that away.",
    onceKey: "first_combat_victory",
  },
  beforeBossRoom: {
    type: "meta_message" as const,
    text: "This chamber is the clause everything else was written to justify.",
    onceKey: "before_boss_room",
  },
  /** Shown when entering the boss room after discovering the letter fragment. */
  bossLetterReveal: {
    type: "meta_message" as const,
    text: "You carried the name in with you. The binding already knew you could read it.",
    onceKey: "boss_enter_with_letter",
  },
  afterFirstReward: {
    type: "meta_message" as const,
    text: "Whatever the room gave you, the run will ask for it back with interest.",
    onceKey: "after_first_reward",
  },
  entranceCleared: {
    type: "meta_message" as const,
    text: "The hall only taught you how to read what comes next.",
    onceKey: "entrance_cleared_meta",
  },
  readFragment: {
    type: "meta_message" as const,
    text: "That name was always going to be spoken here—whether you whisper it or shout.",
    onceKey: "read_letter_fragment_meta",
  },
  midpointReveal: {
    type: "meta_message" as const,
    text: "The route board does not lie. You were listed before you knocked.",
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
