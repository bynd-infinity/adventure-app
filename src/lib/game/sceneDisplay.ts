const SCENE_LABELS: Record<string, string> = {
  entrance_hall: "Entrance Hall",
  registry_gallery: "Registry Gallery",
  library: "Library",
  servants_corridor: "Servants' Corridor",
  dining_room: "Dining Room",
  boss_room: "Boss Room",
};

export function sceneDisplayName(scene: string): string {
  return SCENE_LABELS[scene] ?? scene;
}
