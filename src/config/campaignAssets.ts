import type { RoomId } from "@/lib/story/rooms";

/**
 * Exploration / story scenes — full-room plates under /public/backgrounds.
 */
export const CAMPAIGN_ROOM_BACKGROUND: Record<RoomId, string> = {
  entrance_hall: "/backgrounds/entrance-hall.png",
  registry_gallery: "/backgrounds/registry-gallery.png",
  library: "/backgrounds/library.png",
  servants_corridor: "/backgrounds/servants-corridor.png",
  dining_room: "/backgrounds/dining-room.png",
  boss_room: "/backgrounds/boss-room.png",
};

/** Fallbacks when a room plate is missing (legacy). */
export const CAMPAIGN_ROOM_BACKGROUND_FALLBACK: Partial<Record<RoomId, string>> = {
  registry_gallery: "/backgrounds/entrance-hall.png",
  servants_corridor: "/backgrounds/dining-room.png",
  boss_room: "/backgrounds/entrance-hall.png",
};

/**
 * Combat UI — dedicated battle plates under /public/backgrounds/battle.
 * Falls back to exploration art if a file is absent.
 */
export const CAMPAIGN_BATTLE_BACKGROUND: Record<RoomId, string> = {
  entrance_hall: "/backgrounds/battle/battle-entrance-hall.png",
  registry_gallery: "/backgrounds/battle/battle-registry-gallery.png",
  library: "/backgrounds/battle/battle-library.png",
  servants_corridor: "/backgrounds/battle/battle-servants-corridor.png",
  dining_room: "/backgrounds/battle/battle-dining-room.png",
  boss_room: "/backgrounds/battle/battle-boss-room.png",
};

/** Enemy template id → sprite under /public/enemies (must match `ENEMY_TEMPLATES` ids). */
export const ENEMY_SPRITE_BY_TEMPLATE: Record<string, string> = {
  restless_spirit: "/enemies/restless-spirit.png",
  cursed_doll: "/enemies/cursed-doll.png",
  shadow_figure: "/enemies/shadow-figure.png",
  possessed_armor: "/enemies/possessed-armor.png",
  portrait_sentry: "/enemies/portrait-sentry.png",
  service_lurker: "/enemies/service-lurker.png",
  bound_spirit: "/enemies/bound-spirit.png",
};

/** Single URL for exploration-layer CSS (GameRuntime, etc.). */
export function explorationBackdropForRoom(room: RoomId): string {
  return (
    CAMPAIGN_ROOM_BACKGROUND[room] ??
    CAMPAIGN_ROOM_BACKGROUND_FALLBACK[room] ??
    "/backgrounds/entrance-hall.png"
  );
}

/** Battle arena backdrop: battle plate first, then exploration plate. */
export function battleViewBackdropForRoom(room: RoomId): string {
  return CAMPAIGN_BATTLE_BACKGROUND[room] ?? explorationBackdropForRoom(room);
}
