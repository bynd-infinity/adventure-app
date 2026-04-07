const SCENE_LABELS: Record<string, string> = {
  entrance_hall: "Entrance Hall",
};

export function sceneDisplayName(scene: string): string {
  return SCENE_LABELS[scene] ?? scene;
}
