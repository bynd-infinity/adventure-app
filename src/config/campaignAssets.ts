import type { RoomId } from "@/lib/story/rooms";

/**
 * Phase 3 asset wiring:
 * - New rooms point to dedicated background paths (with current safe fallbacks).
 * - Enemy template ids map to sprite paths under /public/enemies.
 */
export const CAMPAIGN_ROOM_BACKGROUND: Record<RoomId, string> = {
  entrance_hall: "/backgrounds/entrance-hall.png",
  registry_gallery: "/backgrounds/registry-gallery.png",
  library: "/backgrounds/library.png",
  servants_corridor: "/backgrounds/servants-corridor.png",
  dining_room: "/backgrounds/dining-room.png",
  boss_room: "/backgrounds/boss-room.png",
};

/** Fallback backgrounds while dedicated art is still being produced. */
export const CAMPAIGN_ROOM_BACKGROUND_FALLBACK: Partial<Record<RoomId, string>> = {
  registry_gallery: "/backgrounds/entrance-hall.png",
  servants_corridor: "/backgrounds/dining-room.png",
  boss_room: "/backgrounds/entrance-hall.png",
};

export const ENEMY_SPRITE_BY_TEMPLATE: Record<string, string> = {
  restless_spirit: "/enemies/restless-spirit.png",
  cursed_doll: "/enemies/cursed-doll.png",
  shadow_figure: "/enemies/shadow-figure.png",
  possessed_armor: "/enemies/possessed-armor.png",
  portrait_sentry: "/enemies/portrait-sentry.png",
  service_lurker: "/enemies/service-lurker.png",
  bound_spirit: "/enemies/bound-spirit.png",
};
