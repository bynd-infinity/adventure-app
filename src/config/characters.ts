import { isValidPlayerClass, type PlayerClassId } from "@/lib/lobby/constants";

/** Class portraits in /public/characters (transparent PNGs preferred). */
export const CLASS_CHARACTER_IMAGE: Record<PlayerClassId, string> = {
  Blade: "/characters/bladeperson.png",
  Spark: "/characters/sparkperson.png",
  Shadow: "/characters/shadowperson.png",
  Guard: "/characters/guardperson.png",
};

/**
 * Optional attack-frame art (phase 2). When missing, BattleArena uses idle art + CSS strike.
 * Add files such as `/characters/bladeperson-strike.png` when ready.
 */
export const CLASS_CHARACTER_STRIKE_IMAGE: Partial<Record<PlayerClassId, string>> = {};

export function characterPortraitSrc(className: string): string | null {
  if (isValidPlayerClass(className)) {
    return CLASS_CHARACTER_IMAGE[className];
  }
  return null;
}

/** Strike pose PNG if present; otherwise null (CSS-only strike). */
export function characterStrikeSrc(className: string): string | null {
  if (!isValidPlayerClass(className)) return null;
  const path = CLASS_CHARACTER_STRIKE_IMAGE[className];
  return path ?? null;
}
