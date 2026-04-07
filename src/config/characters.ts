import { isValidPlayerClass, type PlayerClassId } from "@/lib/lobby/constants";

/** Class portraits in /public/characters (transparent PNGs preferred). */
export const CLASS_CHARACTER_IMAGE: Record<PlayerClassId, string> = {
  Blade: "/characters/bladeperson.png",
  Spark: "/characters/sparkperson.png",
  Shadow: "/characters/shadowperson.png",
  Guard: "/characters/guardperson.png",
};

export function characterPortraitSrc(className: string): string | null {
  if (isValidPlayerClass(className)) {
    return CLASS_CHARACTER_IMAGE[className];
  }
  return null;
}
