import type { StoryBundle, StoryChoice, StoryScene } from "./types";

export function getStoryScene(
  bundle: StoryBundle,
  sceneId: string,
): StoryScene | undefined {
  return bundle.scenes[sceneId];
}

export function findStoryChoice(
  scene: StoryScene,
  choiceId: string,
): StoryChoice | undefined {
  if (scene.type !== "choice") return undefined;
  return scene.choices.find((c) => c.id === choiceId);
}
