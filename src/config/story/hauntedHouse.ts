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
      type: "choice",
      text: "Choose your path.",
      choices: [
        {
          id: "staircase",
          label: "Investigate the staircase",
          nextSceneId: "eh_hub",
          narrativeLine: "You step toward the staircase. Something cold manifests ahead.",
          effects: [
            metaVillainEffects.entranceFirstChoice,
            {
              type: "start_combat",
              room: "entrance_hall",
              resumeSceneId: "eh_hub",
            },
          ],
        },
        {
          id: "doorway",
          label: "Search the dark doorway",
          nextSceneId: "eh_hub",
          narrativeLine: "You search the doorway and find only cold silence.",
          effects: [
            metaVillainEffects.entranceFirstChoice,
            {
              type: "branch_if",
              condition: "room_can_exit",
              elseSceneId: "eh_doorway_peek",
              thenEffects: [
                metaVillainEffects.entranceCleared,
                {
                  type: "grant_reward",
                  markRoomComplete: "entrance_hall",
                  completionCard: {
                    title: "A Hollow Discovery",
                    message: "Nothing stirs here. Another wing calls to you.",
                    cta: "Leave Room",
                    next: "room_select",
                  },
                },
              ],
            },
          ],
        },
        {
          id: "callout",
          label: "Call out into the hall",
          nextSceneId: "eh_hub",
          narrativeLine: "Your call echoes back. The chill bites for 2 HP.",
          effects: [
            metaVillainEffects.entranceFirstChoice,
            { type: "damage_player", amount: 2 },
            {
              type: "start_combat",
              room: "entrance_hall",
              resumeSceneId: "eh_hub",
            },
          ],
        },
      ],
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
