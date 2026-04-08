import type { RoomId } from "@/lib/story/rooms";

export type DecisionRisk = "low" | "medium" | "high";
export type DecisionFocus = "clue" | "safety" | "force";

export const CAMPAIGN_ROOM_UNLOCKS: Record<RoomId, RoomId[]> = {
  entrance_hall: ["registry_gallery", "library"],
  registry_gallery: [],
  library: [],
  servants_corridor: [],
  dining_room: [],
  boss_room: [],
};

export function unlockedRoomsForRun(completedRooms: RoomId[]): RoomId[] {
  const unlocked: RoomId[] = [];
  if (!completedRooms.includes("registry_gallery")) unlocked.push("registry_gallery");
  if (!completedRooms.includes("library")) unlocked.push("library");
  if (
    completedRooms.includes("registry_gallery") &&
    completedRooms.includes("library") &&
    !completedRooms.includes("servants_corridor")
  ) {
    unlocked.push("servants_corridor");
  }
  if (!completedRooms.includes("dining_room")) unlocked.push("dining_room");
  if (
    completedRooms.includes("servants_corridor") &&
    completedRooms.includes("dining_room")
  ) {
    unlocked.push("boss_room");
  }
  return unlocked;
}

export function campaignObjectiveFromState(
  room: RoomId,
  completedRooms: RoomId[],
  flags: Record<string, boolean>,
): string {
  if (room === "entrance_hall") return "Read the hall before moving deeper.";
  if (room === "registry_gallery") return "Confirm whether the registry is staged.";
  if (room === "library") return "Extract the indexing pattern.";
  if (room === "servants_corridor") return "Verify who assigned this run.";
  if (room === "dining_room") return "Read the social contract of the table.";
  if (room === "boss_room") {
    if (flags.read_house_sigil && flags.registry_names_staged && flags.twist_party_listed) {
      return "You have enough truth to sever the contract.";
    }
    return "Break, rewrite, or inherit the binding.";
  }
  if (!completedRooms.includes("registry_gallery") || !completedRooms.includes("library")) {
    return "Clear the investigative wing.";
  }
  return "Push toward the final chamber.";
}
