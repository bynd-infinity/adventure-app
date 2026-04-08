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
          "Your hands sweep corners and baseboards; only grit and loose varnish answer.",
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
            "Your fingers snag a charred corner wedged deep in cracked mortar—a stash someone missed.",
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
            "Under the arch your palms find frost where no draft should be—old wood hoards the cold.",
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
          "You pat chair rails and newel posts; nothing hidden, only splinters and stale plaster dust.",
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
          "A scrap of paper yields to your nails, wedged tight where lime has split.",
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
          "You step toward the stairs; the risers feel wrong underfoot—cold wells up like a draft from below.",
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
          "You trace every seam with your knuckles—this frame has been leaned on, watched, waited at.",
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
        "Another pass with hands and boots turns up nothing new—only what you already moved.",
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
          "Ornament and shadow refuse to resolve into a pattern—you look away before it clicks.",
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
          "You align the fragment’s strokes with marks in the molding—the name locks into sense behind your eyes.",
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
          "Faint scratches in the plaster echo a symbol you don’t yet have paper for—something was signed here often.",
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
          "The chandelier’s geometry is wrong: one facet always catches a light that isn’t in the room.",
          rs,
        ),
        effects: [],
      };
    }
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(
        tier,
        "Moldings and mirror-glass spell a single intent: this hall was designed to be read, not merely crossed.",
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
        "You hold your breath and hear only your pulse—whatever moves here stayed one room ahead.",
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
        "The house measures you back: floorboards cool, air still—you know now you’re not alone in the listening.",
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
          ? "You half-expected the answer—still, the chill bites, but you roll with it."
          : "Something answers your attention with weight and cold—you’re caught flat-footed.",
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
      "Echoes return in your own rhythm—the hall is mocking your cadence.",
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
          message: "You can press onward through the haunted estate.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    const detail =
      tier === "fail"
        ? "You shake folios and work loose a drawer—only moth-wing dust and a stuck latch."
        : tier === "success"
          ? "Behind a warped panel you find a hollow: empty now, but finger-smudged along the edge."
          : tier === "strong"
            ? "A false spine pivots; something heavy was shelved here until recently."
            : "You map by touch—one shelf rides forward on hidden pins, a stash-route someone used for years.";
    return {
      outcomeTitle: "Search",
      outcomeMessage: line(tier, detail, rs),
      effects,
    };
  }
  if (action === "inspect") {
    if (tier === "strong" || tier === "critical") {
      return {
        outcomeTitle: "False geometry",
        outcomeMessage: line(
          tier,
          "Margins and shelf-depth don’t add up—you lever the lie. The gap answers with teeth.",
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
        ? "Ciphered marginalia swims; the hand that wrote it didn’t want readers—only carriers."
        : tier === "success"
          ? "Repeated symbols notch the same titles—someone indexed fear like a catalogue."
          : "The index isn’t alphabetical; it’s ritual order. You know which volume comes next.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  if (tier === "strong" || tier === "critical") {
    const curseHp = flags.library_listen_attuned ? 1 : 2;
    return {
      outcomeTitle: "Vocal curse",
      outcomeMessage: line(
        tier,
        flags.library_listen_attuned
          ? "You braced for a voice in the stacks—it still cuts, but you slip the worst of it."
          : "A curse rides a breath between shelves; it finds you before you find the mouth.",
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
      ? "Paper lies dead; the stacks eat footfalls and return nothing."
      : "Something scratches inside a spine—then stills when you face the row.";
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
          message: "You can press onward through the haunted estate.",
          cta: "Leave Room",
          next: "room_select",
        },
      });
    }
    const detail =
      tier === "fail"
        ? "Sideboard drawers groan; crumbs and a bent fork—no stash, only neglect."
        : tier === "success"
          ? "You lift a loose floorboard strip: wax drippings and a knife wrapped in stained linen."
          : tier === "strong"
            ? "Behind the wainscot your knuckles find a slit—someone passed notes without sitting."
            : "Every hiding place tells the same story: meals served to seats that were never empty.";
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
          "Placement isn’t habit—it’s binding. The chairs remember who faced the head.",
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
        ? "Etched crests blur; the table’s symmetry feels accidental, not earned."
        : tier === "success"
          ? "Knife angles aim at the empty chair—every setting agrees who was meant to break first."
          : "You read the meal as sequence: bread, oath, blood. The room was a contract.";
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
          ? "The bell you heard coming still rings—but you’re already shifting, and the sting is lighter."
          : "A tone you never struck answers your ears alone—pain follows before you can move.",
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
      ? "Servants’ passages breathe once, then pretend to be walls."
      : "Footfalls pace the pantry you can’t see—whoever serves here is still on shift.";
  return {
    outcomeTitle: "Listen",
    outcomeMessage: line(tier, detail, rs),
    effects:
      tier === "fail"
        ? []
        : [{ type: "set_flag", key: "dining_listen_attuned" }],
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
        ? "Ash cakes your fingertips; grit hides whether the stone was ever clean."
        : tier === "success"
          ? "You pocket a flake of sealing wax and a link-pin bent by strain—tactile proof someone fought the circle."
          : tier === "strong"
            ? "Under the altar lip: hair, thread, a scrap of collar—offerings shoved out of sight."
            : "Your hands map every anchor point: wax trails, scored iron, a groove where knees wore stone.";
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
          "You read the ward’s break in the links—understanding draws the binding’s attention to your skin.",
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
        : tier === "success"
          ? "The script whispers half-words you almost parse—ink wants a reader before a victim."
          : "Warding syllables show their seam: one glyph repeats wrong, a deliberate flaw left to bait the curious.";
    return {
      outcomeTitle: "Inspect",
      outcomeMessage: line(tier, detail, rs),
      effects: [],
    };
  }
  const detail =
    tier === "fail"
      ? "The hum stops when you try to place it—whatever listens doesn’t want triangulation."
      : tier === "success"
        ? "Weight shifts in the dark beyond the chains—someone stands where light won’t fall."
        : tier === "strong"
          ? "Breath skates your nape without wind; the circle tightens a notch when you don’t flinch."
          : "A choir of mouths shapes your name in the rafters—you hear the binding choose its next hinge.";
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
  if (room === "dining_room") {
    return resolveDining(action, tier, exitOk, flags, rollSuffixText);
  }
  return resolveBoss(action, tier, rollSuffixText);
}
