import type {
  ExplorationActionKind,
  ExplorationPacingContext,
} from "@/lib/game/explorationResolve";
import type { RoomId } from "@/lib/story/rooms";
import { isValidPlayerClass } from "@/lib/lobby/constants";

/**
 * Class-based exploration advantage (Search / Inspect / Listen).
 * Disadvantage from exploration is unused for now — keep rules minimal.
 */
export function explorationHasAdvantage(
  className: string,
  action: ExplorationActionKind,
  room: RoomId,
  flags: Record<string, boolean>,
  pacing: ExplorationPacingContext,
): boolean {
  if (!isValidPlayerClass(className)) return false;

  if (className === "Shadow" && action === "search") {
    return (
      room === "library" ||
      room === "registry_gallery" ||
      room === "servants_corridor" ||
      room === "dining_room" ||
      room === "entrance_hall"
    );
  }

  if (className === "Spark" && action === "inspect") {
    return (
      Boolean(flags.found_letter_fragment) ||
      room === "library" ||
      room === "registry_gallery" ||
      room === "boss_room"
    );
  }

  if (className === "Guard" && action === "listen") {
    return pacing.combatTriggered || room === "boss_room";
  }

  return false;
}
