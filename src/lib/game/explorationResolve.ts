import { metaVillainEffects } from "@/config/story/hauntedHouse";
import type { RoomId } from "@/lib/story/rooms";
import type { StoryEffect } from "@/lib/story/types";

export type ExplorationActionKind = "search" | "inspect" | "listen";

export type ExplorationPacingContext = {
  interactionCount: number;
  combatTriggered: boolean;
  combatResolved: boolean;
};

export function explorationCanExitRoom(ctx: ExplorationPacingContext): boolean {
  return (
    ctx.interactionCount >= 2 && (!ctx.combatTriggered || ctx.combatResolved)
  );
}

export type ExplorationResolveOutput = {
  outcomeTitle: string;
  outcomeMessage: string;
  effects: StoryEffect[];
};

function rollSuffix(roll: number): string {
  return ` (rolled ${roll})`;
}

function resolveEntrance(
  action: ExplorationActionKind,
  roll: number,
  flags: Record<string, boolean>,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    if (!flags.found_letter_fragment && roll >= 14) {
      return {
        outcomeTitle: "Discovery",
        outcomeMessage: `Your fingers catch a scrap of paper wedged in cracked mortar.${rs}`,
        effects: [
          metaVillainEffects.entranceFirstChoice,
          { type: "set_flag", key: "found_letter_fragment" },
          { type: "add_clue", clueId: "letter_fragment" },
        ],
      };
    }
    if (!flags.fought_entrance_stairs && roll >= 16) {
      return {
        outcomeTitle: "Uneasy movement",
        outcomeMessage: `The staircase seems to breathe. Cold gathers ahead.${rs}`,
        effects: [
          metaVillainEffects.entranceFirstChoice,
          { type: "set_flag", key: "fought_entrance_stairs" },
          {
            type: "start_combat",
            room: "entrance_hall",
            resumeSceneId: "eh_hub",
          },
        ],
      };
    }
    if (!flags.searched_doorway && roll >= 8) {
      return {
        outcomeTitle: "The doorway",
        outcomeMessage: `Draft and old varnish; the frame remembers every footstep.${rs}`,
        effects: [
          { type: "set_flag", key: "searched_doorway" },
          metaVillainEffects.entranceFirstChoice,
        ],
      };
    }
    if (roll <= 5) {
      return {
        outcomeTitle: "No luck",
        outcomeMessage: `Dust swirls and settles. Whatever hides here eludes you for now.${rs}`,
        effects: [],
      };
    }
    return {
      outcomeTitle: "Search",
      outcomeMessage: `Boards creak overhead. Splinters and stale air—nothing more.${rs}`,
      effects: [],
    };
  }

  if (action === "inspect") {
    if (
      flags.found_letter_fragment &&
      !flags.read_house_sigil &&
      roll >= 8
    ) {
      return {
        outcomeTitle: "Faded ink",
        outcomeMessage: `A name you do not know twists behind your eyes.${rs}`,
        effects: [
          { type: "set_flag", key: "read_house_sigil" },
          metaVillainEffects.readFragment,
        ],
      };
    }
    if (!flags.searched_doorway) {
      return {
        outcomeTitle: "Architecture",
        outcomeMessage: `Carved moldings and hairline cracks—you map the hall without meaning to.${rs}`,
        effects: [
          { type: "set_flag", key: "searched_doorway" },
          metaVillainEffects.entranceFirstChoice,
        ],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: `The chandelier’s crystals are dull, yet each facet holds a pinprick of light.${rs}`,
      effects: [],
    };
  }

  // listen
  if (!flags.hall_callout_used && roll >= 11) {
    return {
      outcomeTitle: "Answered silence",
      outcomeMessage: `Your listening draws something closer—the chill bites for 2 HP.${rs}`,
      effects: [
        metaVillainEffects.entranceFirstChoice,
        { type: "damage_player", amount: 2 },
        { type: "set_flag", key: "hall_callout_used" },
        {
          type: "start_combat",
          room: "entrance_hall",
          resumeSceneId: "eh_hub",
        },
      ],
    };
  }
  if (flags.hall_callout_used) {
    return {
      outcomeTitle: "Listen",
      outcomeMessage: `Echoes return too quickly, as if the house rehearsed them.${rs}`,
      effects: [],
    };
  }
  return {
    outcomeTitle: "Listen",
    outcomeMessage: `Somewhere, floorboards settle. Nothing steps into view.${rs}`,
    effects: [],
  };
}

function resolveLibrary(
  action: ExplorationActionKind,
  roll: number,
  exitOk: boolean,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    const effects: StoryEffect[] = [];
    if (exitOk) {
      effects.push({
        type: "grant_reward",
        markRoomComplete: "library",
        completionCard: {
          title: "Library Cleared",
          message: "You can press onward through the haunted estate.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    return {
      outcomeTitle: "Search",
      outcomeMessage: `Dusty tomes crumble in your hands. The stacks keep their real secrets close.${rs}`,
      effects,
    };
  }
  if (action === "inspect") {
    if (roll >= 14) {
      return {
        outcomeTitle: "Hidden nook",
        outcomeMessage: `A panel sighs open. Shelves tremble as a presence surges forward.${rs}`,
        effects: [
          {
            type: "start_combat",
            room: "library",
            resumeSceneId: "eh_hub",
          },
        ],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: `Sagging shelves and tilted spines—nothing moves until you do.${rs}`,
      effects: [],
    };
  }
  if (roll >= 12) {
    return {
      outcomeTitle: "Whispered page",
      outcomeMessage: `A line of text crawls off the page toward you. Cold follows.${rs}`,
      effects: [
        { type: "damage_player", amount: 2 },
        {
          type: "start_combat",
          room: "library",
          resumeSceneId: "eh_hub",
        },
      ],
    };
  }
  return {
    outcomeTitle: "Listen",
    outcomeMessage: `Pages brush together like dry wings. No words resolve.${rs}`,
    effects: [],
  };
}

function resolveDining(
  action: ExplorationActionKind,
  roll: number,
  exitOk: boolean,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    const effects: StoryEffect[] = [];
    if (exitOk) {
      effects.push({
        type: "grant_reward",
        markRoomComplete: "dining_room",
        completionCard: {
          title: "Dining Room Cleared",
          message: "You can press onward through the haunted estate.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    return {
      outcomeTitle: "Search",
      outcomeMessage: `The cabinet yields dust, silver polish, and stubborn quiet.${rs}`,
      effects,
    };
  }
  if (action === "inspect") {
    if (roll >= 10) {
      return {
        outcomeTitle: "Banquet disturbed",
        outcomeMessage: `Plates scrape. The room erupts into motion.${rs}`,
        effects: [
          {
            type: "start_combat",
            room: "dining_room",
            resumeSceneId: "eh_hub",
          },
        ],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: `Tarnish and candle-grease. You keep a respectful distance.${rs}`,
      effects: [],
    };
  }
  if (roll >= 11) {
    return {
      outcomeTitle: "Silver bell",
      outcomeMessage: `A tone you did not strike rings true—and pain answers.${rs}`,
      effects: [
        { type: "damage_player", amount: 2 },
        {
          type: "start_combat",
          room: "dining_room",
          resumeSceneId: "eh_hub",
        },
      ],
    };
  }
  return {
    outcomeTitle: "Listen",
    outcomeMessage: `Silverware tremors once, then lies still.${rs}`,
    effects: [],
  };
}

function resolveBoss(
  action: ExplorationActionKind,
  roll: number,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    if (roll >= 15) {
      return {
        outcomeTitle: "Search",
        outcomeMessage: `Chains describe a circle you cannot see. Wax and ash mark the stone.${rs}`,
        effects: [],
      };
    }
    return {
      outcomeTitle: "Search",
      outcomeMessage: `Altar grit and old iron—details slip away when stared at directly.${rs}`,
      effects: [],
    };
  }
  if (action === "inspect") {
    if (roll >= 14) {
      return {
        outcomeTitle: "Spirit chain",
        outcomeMessage: `Cold fire climbs your arm. The links remember every oath they held.${rs}`,
        effects: [
          { type: "damage_player", amount: 3 },
          {
            type: "start_combat",
            room: "boss_room",
            resumeSceneId: "eh_hub",
          },
        ],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: `Runes waver at the edge of sense. Looking away feels safer.${rs}`,
      effects: [],
    };
  }
  if (roll >= 15) {
    return {
      outcomeTitle: "Warding whispers",
      outcomeMessage: `The script is incomplete; ink flakes into harmless dust.${rs}`,
      effects: [],
    };
  }
  return {
    outcomeTitle: "Listen",
    outcomeMessage: `A low hum threads through the chains—patient, unfinished.${rs}`,
    effects: [],
  };
}

export function resolveExplorationAction(
  room: RoomId,
  action: ExplorationActionKind,
  roll: number,
  flags: Record<string, boolean>,
  pacing: ExplorationPacingContext,
): ExplorationResolveOutput {
  const rs = rollSuffix(roll);
  const exitOk = explorationCanExitRoom(pacing);

  if (room === "entrance_hall") {
    return resolveEntrance(action, roll, flags, rs);
  }
  if (room === "library") {
    return resolveLibrary(action, roll, exitOk, rs);
  }
  if (room === "dining_room") {
    return resolveDining(action, roll, exitOk, rs);
  }
  return resolveBoss(action, roll, rs);
}
