import { metaVillainEffects } from "@/config/story/hauntedHouse";
import type { RoomId } from "@/lib/story/rooms";
import type { StoryEffect } from "@/lib/story/types";
import {
  explorationTierLead,
  type OutcomeTier,
} from "@/lib/game/statRolls";

export type ExplorationActionKind = "search" | "inspect" | "listen";

export type ExplorationPacingContext = {
  interactionCount: number;
  combatTriggered: boolean;
  combatResolved: boolean;
  usedSearch: boolean;
  usedInspect: boolean;
  usedListen: boolean;
  /** Entrance hall: number of Search actions this visit (letter fragment recovery). */
  entranceSearchPasses: number;
};

/** Pacing: avoid clearing rooms after one or two clicks; require breadth + depth. */
const MIN_INTERACTIONS_BEFORE_EXIT = 4;
const MIN_DISTINCT_ACTION_TYPES = 2;

/**
 * Exit / wing-clear eligibility: combat resolved if started, enough total actions,
 * and at least two kinds of exploration (Search / Inspect / Listen) so the room was
 * actually probed—not a single spammed action or one failed roll.
 */
export function explorationCanExitRoom(ctx: ExplorationPacingContext): boolean {
  if (ctx.combatTriggered && !ctx.combatResolved) return false;
  if (ctx.interactionCount < MIN_INTERACTIONS_BEFORE_EXIT) return false;
  const kinds =
    (ctx.usedSearch ? 1 : 0) +
    (ctx.usedInspect ? 1 : 0) +
    (ctx.usedListen ? 1 : 0);
  return kinds >= MIN_DISTINCT_ACTION_TYPES;
}

export type ExplorationResolveOutput = {
  outcomeTitle: string;
  outcomeMessage: string;
  effects: StoryEffect[];
};

function line(tier: OutcomeTier, detail: string, rs: string): string {
  return `${explorationTierLead(tier)} ${detail}${rs}`;
}

function resolveEntrance(
  action: ExplorationActionKind,
  tier: OutcomeTier,
  flags: Record<string, boolean>,
  rs: string,
  pacing: ExplorationPacingContext,
): ExplorationResolveOutput {
  if (action === "search") {
    if (tier === "fail") {
      return {
        outcomeTitle: "No luck",
        outcomeMessage: line(
          tier,
          "Dust swirls and settles; the hall offers nothing more.",
          rs,
        ),
        effects: [],
      };
    }
    if (tier === "success") {
      /* Important clue: fragment recoverable after repeated Search (not only high tiers). */
      if (
        !flags.found_letter_fragment &&
        pacing.entranceSearchPasses >= 3
      ) {
        return {
          outcomeTitle: "Discovery",
          outcomeMessage: line(
            tier,
            "Persistence finds a charred edge—paper wedged where the mortar cracked.",
            rs,
          ),
          effects: [
            metaVillainEffects.entranceFirstChoice,
            { type: "set_flag", key: "found_letter_fragment" },
            { type: "add_clue", clueId: "letter_fragment" },
          ],
        };
      }
      if (!flags.searched_doorway) {
        return {
          outcomeTitle: "The doorway",
          outcomeMessage: line(
            tier,
            "Draft and old varnish—the frame remembers every footstep.",
            rs,
          ),
          effects: [
            { type: "set_flag", key: "searched_doorway" },
            metaVillainEffects.entranceFirstChoice,
          ],
        };
      }
      return {
        outcomeTitle: "Search",
        outcomeMessage: line(
          tier,
          "Boards creak overhead. Splinters and stale air—nothing more.",
          rs,
        ),
        effects: [],
      };
    }
    // strong or critical — prioritize letter, then stairs combat, then doorway
    if (!flags.found_letter_fragment) {
      return {
        outcomeTitle: "Discovery",
        outcomeMessage: line(
          tier,
          "Your fingers catch a scrap of paper wedged in cracked mortar.",
          rs,
        ),
        effects: [
          metaVillainEffects.entranceFirstChoice,
          { type: "set_flag", key: "found_letter_fragment" },
          { type: "add_clue", clueId: "letter_fragment" },
        ],
      };
    }
    if (!flags.fought_entrance_stairs) {
      return {
        outcomeTitle: "Uneasy movement",
        outcomeMessage: line(
          tier,
          "The staircase seems to breathe. Cold gathers ahead.",
          rs,
        ),
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
    if (!flags.searched_doorway) {
      return {
        outcomeTitle: "The doorway",
        outcomeMessage: line(
          tier,
          "Every seam in the wood stands out—this threshold has been watched.",
          rs,
        ),
        effects: [
          { type: "set_flag", key: "searched_doorway" },
          metaVillainEffects.entranceFirstChoice,
        ],
      };
    }
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(
        tier,
        "You turn the room again; only echoes answer.",
        rs,
      ),
      effects: [],
    };
  }

  if (action === "inspect") {
    if (tier === "fail") {
      return {
        outcomeTitle: "Inspect",
        outcomeMessage: line(
          tier,
          "The chandelier’s crystals stay dull; your eye slides off the details.",
          rs,
        ),
        effects: [],
      };
    }
    const canReadSigil =
      flags.found_letter_fragment &&
      !flags.read_house_sigil &&
      (tier === "strong" ||
        tier === "critical" ||
        (tier === "success" && pacing.interactionCount >= 6));
    if (canReadSigil) {
      return {
        outcomeTitle: "Faded ink",
        outcomeMessage: line(
          tier,
          "A name you do not know twists behind your eyes.",
          rs,
        ),
        effects: [
          { type: "set_flag", key: "read_house_sigil" },
          metaVillainEffects.readFragment,
        ],
      };
    }
    if (!flags.searched_doorway && (tier === "success" || tier === "strong" || tier === "critical")) {
      return {
        outcomeTitle: "Architecture",
        outcomeMessage: line(
          tier,
          "Carved moldings and hairline cracks—you map the hall without meaning to.",
          rs,
        ),
        effects: [
          { type: "set_flag", key: "searched_doorway" },
          metaVillainEffects.entranceFirstChoice,
        ],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(
        tier,
        "Each facet of glass holds a pinprick of light, deliberate and wrong.",
        rs,
      ),
      effects: [],
    };
  }

  // listen
  if (tier === "fail") {
    return {
      outcomeTitle: "Listen",
      outcomeMessage: line(
        tier,
        "Silence presses in; even your breath feels too loud.",
        rs,
      ),
      effects: [],
    };
  }
  if (tier === "success") {
    return {
      outcomeTitle: "Listen",
      outcomeMessage: line(
        tier,
        "Somewhere, floorboards settle. Nothing steps into view.",
        rs,
      ),
      effects: [],
    };
  }
  if (!flags.hall_callout_used) {
    return {
      outcomeTitle: "Answered silence",
      outcomeMessage: line(
        tier,
        "Your listening draws something closer—the chill bites for 2 HP.",
        rs,
      ),
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
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(
      tier,
      "Echoes return too quickly, as if the house rehearsed them.",
      rs,
    ),
    effects: [],
  };
}

function resolveLibrary(
  action: ExplorationActionKind,
  tier: OutcomeTier,
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
    const detail =
      tier === "fail"
        ? "Tomes shed dust into your hands; the stacks give up nothing sharp."
        : tier === "success"
          ? "Dusty spines crumble; the library falls quiet, withholding."
          : tier === "strong"
            ? "A draft names a shelf others walked past—patterns emerge."
            : "Whole rows align in your mind; you know where silence is heaviest.";
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(tier, detail, rs),
      effects,
    };
  }
  if (action === "inspect") {
    if (tier === "strong" || tier === "critical") {
      return {
        outcomeTitle: "Hidden nook",
        outcomeMessage: line(
          tier,
          "A panel sighs open. Shelves tremble as a presence surges forward.",
          rs,
        ),
        effects: [
          {
            type: "start_combat",
            room: "library",
            resumeSceneId: "eh_hub",
          },
        ],
      };
    }
    const detail =
      tier === "fail"
        ? "Tilted spines and sagging wood refuse to yield a pattern."
        : "Sagging shelves and tilted spines—nothing moves until you do.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  if (tier === "strong" || tier === "critical") {
    return {
      outcomeTitle: "Whispered page",
      outcomeMessage: line(
        tier,
        "A line of text crawls off the page toward you. Cold follows.",
        rs,
      ),
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
  const detail =
    tier === "fail"
      ? "The stacks swallow sound; not even paper rustles."
      : "Pages brush together like dry wings. No words resolve.";
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(tier, detail, rs),
    effects: [],
  };
}

function resolveDining(
  action: ExplorationActionKind,
  tier: OutcomeTier,
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
    const detail =
      tier === "fail"
        ? "Drawers stick; polish and dust, nothing more."
        : tier === "success"
          ? "The cabinet yields dust, silver polish, and stubborn quiet."
          : tier === "strong"
            ? "You catch a seam in the varnish—someone counted meals here."
            : "Silver aligns with memory; the room admits it was watched.";
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(tier, detail, rs),
      effects,
    };
  }
  if (action === "inspect") {
    if (tier === "strong" || tier === "critical") {
      return {
        outcomeTitle: "Banquet disturbed",
        outcomeMessage: line(
          tier,
          "Plates scrape. The room erupts into motion.",
          rs,
        ),
        effects: [
          {
            type: "start_combat",
            room: "dining_room",
            resumeSceneId: "eh_hub",
          },
        ],
      };
    }
    const detail =
      tier === "fail"
        ? "Grease and tarnish blur together; your stomach turns away."
        : "Tarnish and candle-grease. You keep a respectful distance.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  if (tier === "strong" || tier === "critical") {
    return {
      outcomeTitle: "Silver bell",
      outcomeMessage: line(
        tier,
        "A tone you did not strike rings true—and pain answers.",
        rs,
      ),
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
  const detail =
    tier === "fail"
      ? "The table lies in dead air; not a fork trembles."
      : "Silverware tremors once, then lies still.";
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(tier, detail, rs),
    effects: [],
  };
}

function resolveBoss(
  action: ExplorationActionKind,
  tier: OutcomeTier,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    const detail =
      tier === "fail"
        ? "Altar grit and iron swim in your vision when you focus."
        : tier === "success"
          ? "Wax drips and old iron—details slip away when stared at."
          : tier === "strong"
            ? "Chains describe a circle you almost see. Ash marks the stone."
            : "The whole layout locks in: circle, altar, anchor—undeniable.";
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  if (action === "inspect") {
    if (tier === "strong" || tier === "critical") {
      return {
        outcomeTitle: "Spirit chain",
        outcomeMessage: line(
          tier,
          "Cold fire climbs your arm. The links remember every oath they held.",
          rs,
        ),
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
    const detail =
      tier === "fail"
        ? "Runes squirm at the corner of your eye; looking away is relief."
        : "Runes waver at the edge of sense. Looking away feels safer.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  const detail =
    tier === "fail"
      ? "The hum stops when you try to place it."
      : tier === "success"
        ? "A low hum threads through the chains—patient, unfinished."
        : tier === "strong"
          ? "The script whispers half-words; ink flakes without burning you."
          : "Warding syllables unravel into harmless dust—you heard the true gap.";
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(tier, detail, rs),
    effects: [],
  };
}

export function resolveExplorationAction(
  room: RoomId,
  action: ExplorationActionKind,
  tier: OutcomeTier,
  flags: Record<string, boolean>,
  pacing: ExplorationPacingContext,
  rollSuffixText: string,
): ExplorationResolveOutput {
  const exitOk = explorationCanExitRoom(pacing);

  if (room === "entrance_hall") {
    return resolveEntrance(action, tier, flags, rollSuffixText, pacing);
  }
  if (room === "library") {
    return resolveLibrary(action, tier, exitOk, rollSuffixText);
  }
  if (room === "dining_room") {
    return resolveDining(action, tier, exitOk, rollSuffixText);
  }
  return resolveBoss(action, tier, rollSuffixText);
}
