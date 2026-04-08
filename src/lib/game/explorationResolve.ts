import { metaVillainEffects } from "@/config/story/hauntedHouse";
import type { RoomId } from "@/lib/story/rooms";
import type { StoryEffect } from "@/lib/story/types";
import type { OutcomeTier } from "@/lib/game/statRolls";

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

/** Outcome body + roll suffix only; tier is already reflected in `detail` and outcome title. */
function line(_tier: OutcomeTier, detail: string, rs: string): string {
  return `${detail}${rs}`;
}

/*
 * Action roles (outcomes follow these, not interchangeable buttons):
 * - Search: physical discovery — objects, stashes, surfaces, mortar, drawers.
 * - Inspect: interpretation — symbols, patterns, meanings, odd details, decoding.
 * - Listen: tension & danger — movement, breath, warnings, presence, ambush cues.
 */

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
          "You check corners and trim. Nothing but dust and flaked varnish.",
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
            "You pull a burned paper edge from cracked mortar.",
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
            "The arch frame is cold to the touch on one narrow strip.",
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
          "You work the rails and posts. No hidden catch.",
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
          "A paper fragment comes loose where the plaster split.",
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
          "You test the stair run. Weight shifts above you.",
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
          "Wear marks on the frame show someone stood watch here often.",
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
        "Another pass turns up nothing new.",
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
          "The pattern slips before it resolves.",
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
          "The fragment and molding marks align into a full name.",
          rs,
        ),
        effects: [
          { type: "set_flag", key: "read_house_sigil" },
          metaVillainEffects.readFragment,
        ],
      };
    }
    if (
      !flags.found_letter_fragment &&
      (tier === "success" || tier === "strong" || tier === "critical")
    ) {
      return {
        outcomeTitle: "Inspect",
        outcomeMessage: line(
          tier,
          "Scratches repeat one symbol. You are missing part of it.",
          rs,
        ),
        effects: [],
      };
    }
    if (tier === "success") {
      return {
        outcomeTitle: "Inspect",
        outcomeMessage: line(
          tier,
          "One crystal catches light from no visible source.",
          rs,
        ),
        effects: [],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(
        tier,
        "The hall was built to be read as much as crossed.",
        rs,
      ),
      effects: [],
    };
  }

  // listen — danger, presence, warnings (mechanical: prior success softens ambush damage)
  if (tier === "fail") {
    return {
      outcomeTitle: "Listen",
      outcomeMessage: line(
        tier,
        "You hear your own pulse and little else.",
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
        "You catch a second rhythm in the floorboards.",
        rs,
      ),
      effects: [{ type: "set_flag", key: "entrance_listen_tuned" }],
    };
  }
  if (!flags.hall_callout_used) {
    const ambushHp = flags.entrance_listen_tuned ? 1 : 2;
    return {
      outcomeTitle: "Answered silence",
      outcomeMessage: line(
        tier,
        flags.entrance_listen_tuned
          ? "You half-expected an answer. The chill still bites, but you roll with it."
          : "Something rushes the stairwell and catches you off balance.",
        rs,
      ),
      effects: [
        metaVillainEffects.entranceFirstChoice,
        { type: "damage_player", amount: ambushHp },
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
      "The echo returns a beat too fast.",
      rs,
    ),
    effects: [],
  };
}

function resolveLibrary(
  action: ExplorationActionKind,
  tier: OutcomeTier,
  exitOk: boolean,
  flags: Record<string, boolean>,
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
          message:
            "The stacks gave up their filing logic. You leave knowing how Blackglass sorts lives into lines.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    const detail =
      tier === "fail"
        ? "Drawers jam and folios crumble. No immediate find."
        : tier === "success"
          ? "A warped panel hides a narrow cavity recently used."
          : tier === "strong"
            ? "A false spine pivots. Something heavy was removed in a hurry."
            : "A shelf rides on hidden pins: a practiced stash route.";
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(tier, detail, rs),
      effects,
    };
  }
  if (action === "inspect") {
    if (tier === "strong" || tier === "critical") {
      return {
        outcomeTitle: "False Geometry",
        outcomeMessage: line(
          tier,
          "Margin notes and shelf depth disagree. You pull the false back panel; something answers.",
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
        ? "The marginal code resists quick reading."
        : tier === "success"
          ? "The same symbols mark the same shelf class across volumes."
          : "The index is procedural, not alphabetical. You can predict the next volume.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  if (tier === "strong" || tier === "critical") {
    const curseHp = flags.library_listen_attuned ? 1 : 2;
    return {
        outcomeTitle: "Stack Curse",
      outcomeMessage: line(
        tier,
        flags.library_listen_attuned
          ? "You brace before the whisper lands and reduce the hit."
          : "A voice between stacks snaps a short curse at you.",
        rs,
      ),
      effects: [
        { type: "damage_player", amount: curseHp },
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
      ? "No clear movement. The stacks stay quiet."
      : "A scrape inside one shelf stops when you turn toward it.";
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(tier, detail, rs),
    effects:
      tier === "fail"
        ? []
        : [{ type: "set_flag", key: "library_listen_attuned" }],
  };
}

function resolveDining(
  action: ExplorationActionKind,
  tier: OutcomeTier,
  exitOk: boolean,
  flags: Record<string, boolean>,
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
          message:
            "The table's ceremony is plain. You know who this house meant to crown—and who was meant to serve.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    const detail =
      tier === "fail"
        ? "Drawers stick. Cutlery and crumbs, nothing critical."
        : tier === "success"
          ? "A loose board hides wax drips and wrapped steel."
          : tier === "strong"
            ? "A slit behind the wainscot worked as a pass slot."
            : "Hidden points all face the same chair at the head of the table.";
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(tier, detail, rs),
      effects,
    };
  }
  if (action === "inspect") {
    if (tier === "strong" || tier === "critical") {
      return {
        outcomeTitle: "Set for something",
        outcomeMessage: line(
          tier,
          "Place setting order reads like protocol, not habit. Then the room reacts.",
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
        ? "Crests and seat order blur before you can confirm the pattern."
        : tier === "success"
          ? "Knife angle and plate spacing assign rank across the table."
          : "Course order and symbols imply oath, breach, and sentence.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  if (tier === "strong" || tier === "critical") {
    const bellHp = flags.dining_listen_attuned ? 1 : 2;
    return {
      outcomeTitle: "Silver bell",
      outcomeMessage: line(
        tier,
        flags.dining_listen_attuned
          ? "You move before the bell tone peaks and reduce the hit."
          : "A bell tone rings with no hand on it. Pain follows.",
        rs,
      ),
      effects: [
        { type: "damage_player", amount: bellHp },
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
      ? "Service passages stay quiet."
      : "Footsteps track behind the pantry wall, then stop.";
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(tier, detail, rs),
    effects:
      tier === "fail"
        ? []
        : [{ type: "set_flag", key: "dining_listen_attuned" }],
  };
}

function resolveRegistry(
  action: ExplorationActionKind,
  tier: OutcomeTier,
  exitOk: boolean,
  flags: Record<string, boolean>,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    const effects: StoryEffect[] = [];
    if (exitOk) {
      effects.push({
        type: "grant_reward",
        markRoomComplete: "registry_gallery",
        completionCard: {
          title: "Registry Gallery Cleared",
          message:
            "Forged hands and stolen names are marked. The guest book lies, but you know how it was built.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    const detail =
      tier === "fail"
        ? "Frame backs are sealed tight."
        : tier === "success"
          ? "A hidden pocket behind one frame holds page scraps."
          : tier === "strong"
            ? "You recover trimmed signature strips and wax flakes."
            : "You map the frame mechanism and pull the full hidden packet.";
    if (tier === "success" || tier === "strong" || tier === "critical") {
      effects.push({ type: "set_flag", key: "registry_packet_found" });
    }
    return { outcomeTitle: "Search", outcomeMessage: line(tier, detail, rs), effects };
  }
  if (action === "inspect") {
    const effects: StoryEffect[] = [];
    const detail =
      tier === "fail"
        ? "The names blur together before you can compare hands."
        : tier === "success"
          ? "Several signatures share one pen angle."
          : tier === "strong"
            ? "Tonight's names were copied from an older guest line."
            : "The registry confirms it: entries were staged to guide this run.";
    if (tier === "strong" || tier === "critical") {
      effects.push({ type: "set_flag", key: "registry_names_staged" });
      effects.push({ type: "add_clue", clueId: "registry_forgery" });
    }
    return { outcomeTitle: "Inspect", outcomeMessage: line(tier, detail, rs), effects };
  }
  if (tier === "strong" || tier === "critical") {
    const hp = flags.registry_listen_attuned ? 1 : 2;
    return {
      outcomeTitle: "Portrait Sentry",
      outcomeMessage: line(
        tier,
        flags.registry_listen_attuned
          ? "You shift before the portrait lunge and soften the hit."
          : "A frame snaps open and something strikes from the wall.",
        rs,
      ),
      effects: [
        { type: "damage_player", amount: hp },
        { type: "start_combat", room: "registry_gallery", resumeSceneId: "eh_hub" },
      ],
    };
  }
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(
      tier,
      tier === "fail"
        ? "The gallery goes quiet."
        : "Footsteps track above you, then stop at the stair turn.",
      rs,
    ),
    effects: tier === "fail" ? [] : [{ type: "set_flag", key: "registry_listen_attuned" }],
  };
}

function resolveServants(
  action: ExplorationActionKind,
  tier: OutcomeTier,
  exitOk: boolean,
  flags: Record<string, boolean>,
  rs: string,
): ExplorationResolveOutput {
  if (action === "search") {
    const effects: StoryEffect[] = [];
    if (exitOk) {
      effects.push({
        type: "grant_reward",
        markRoomComplete: "servants_corridor",
        completionCard: {
          title: "Servants' Corridor Cleared",
          message:
            "Routes, tags, and runners' lines are mapped. The house scheduled this party; you have the proof in plaster and ink.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    const detail =
      tier === "fail"
        ? "Supply slots are empty."
        : tier === "success"
          ? "A route marker is freshly scored into the plaster."
          : tier === "strong"
            ? "You recover route tags stamped with tonight's date."
            : "A full route board lists your party initials in order.";
    if (tier === "critical") {
      effects.push({ type: "set_flag", key: "twist_party_listed" });
      effects.push(metaVillainEffects.midpointReveal);
      effects.push({ type: "add_clue", clueId: "party_listed_route_board" });
    }
    return { outcomeTitle: "Search", outcomeMessage: line(tier, detail, rs), effects };
  }
  if (action === "inspect") {
    const effects: StoryEffect[] = [];
    const detail =
      tier === "fail"
        ? "Duty codes remain scrambled."
        : tier === "success"
          ? "Codes map to room sequence and expected resistance."
          : tier === "strong"
            ? "The route plan names this run as a scheduled trial."
            : "The corridor log proves the house prepared this party in advance.";
    if (tier === "strong" || tier === "critical") {
      effects.push({ type: "set_flag", key: "twist_party_listed" });
      effects.push(metaVillainEffects.midpointReveal);
      effects.push({ type: "add_clue", clueId: "party_listed_route_board" });
    }
    return { outcomeTitle: "Inspect", outcomeMessage: line(tier, detail, rs), effects };
  }
  if (tier === "strong" || tier === "critical") {
    const hp = flags.servants_listen_attuned ? 1 : 2;
    return {
      outcomeTitle: "Back-hall Ambush",
      outcomeMessage: line(
        tier,
        flags.servants_listen_attuned
          ? "You hear the runner first and catch only a glancing blow."
          : "Something cuts through the corridor blind corner and hits hard.",
        rs,
      ),
      effects: [
        { type: "damage_player", amount: hp },
        { type: "start_combat", room: "servants_corridor", resumeSceneId: "eh_hub" },
      ],
    };
  }
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(
      tier,
      tier === "fail"
        ? "No movement reaches the junction."
        : "A service bell rings once, then a runner changes direction.",
      rs,
    ),
    effects: tier === "fail" ? [] : [{ type: "set_flag", key: "servants_listen_attuned" }],
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
        ? "Ash coats the altar edge and anchor points."
        : tier === "success"
          ? "You recover wax flakes and a bent link pin from the floor seam."
          : tier === "strong"
            ? "Under the altar lip: thread, hair, and torn collar cloth."
            : "Anchor wear, iron scoring, and floor grooves show repeated use.";
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
          "You identify the ward break in the chain pattern. The binding answers directly.",
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
        ? "The runes refuse stable focus."
        : tier === "success"
          ? "You parse fragments of the script before it collapses into noise."
          : "One glyph is repeated out of sequence. The flaw is intentional.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  const detail =
    tier === "fail"
      ? "The hum cuts out when you try to locate it."
      : tier === "success"
        ? "Weight shifts just beyond the chain ring."
        : tier === "strong"
          ? "Breath passes close with no air movement. The ring tightens."
          : "Multiple voices repeat your name from different points in the room.";
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
    return resolveLibrary(action, tier, exitOk, flags, rollSuffixText);
  }
  if (room === "registry_gallery") {
    return resolveRegistry(action, tier, exitOk, flags, rollSuffixText);
  }
  if (room === "servants_corridor") {
    return resolveServants(action, tier, exitOk, flags, rollSuffixText);
  }
  if (room === "dining_room") {
    return resolveDining(action, tier, exitOk, flags, rollSuffixText);
  }
  return resolveBoss(action, tier, rollSuffixText);
}
