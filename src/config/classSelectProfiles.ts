import type { PlayerClassId } from "@/lib/lobby/constants";

/**
 * One narrative block per class (shared panel — not repeated per party member):
 * where they came from, how they fight, and their exploration specialty in this run.
 */
export const CLASS_SELECT_LORE: Record<PlayerClassId, string> = {
  Blade:
    "You learned violence as a language before you learned tact. In the house you are the one who steps into the frame first—Power is your highest stat, and when the party needs something torn open or dragged into the light, your signature is to search the room like muscle memory, steadying the first pass so the rest of the group can trust what they find.",
  Spark:
    "You treat fear like a circuit: isolate it, name it, break the loop. Mind is your edge—patterns, letters, and half-heard rules resolve faster under your eyes. When the house tries to hide in footnotes and marginalia, your signature inspect turns the text into a map, and the party rides your clarity through the static.",
  Shadow:
    "You were never loud; you survived by reading angles—who looks away, where the floor creaks, what a silence is trying not to say. Skill is your weapon: you slip pressure into the right seam. Your signature inspect is not scholarship but espionage—you read the room’s tells so the party can move without announcing themselves.",
  Guard:
    "You are the weight at the doorframe—breath held, stance wide, listening past your own heartbeat. Guard is your pillar stat, and you trade glory for footing. When the house exhales something that is not quite wind, your signature listen buys the party a beat of truth before anyone commits their weight to a lie.",
};
