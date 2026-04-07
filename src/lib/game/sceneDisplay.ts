const SCENE_LABELS: Record<string, string> = {
  entrance_hall: "Entrance Hall",
  library: "Library",
  dining_room: "Dining Room",
};

export function sceneDisplayName(scene: string): string {
  return SCENE_LABELS[scene] ?? scene;
}
