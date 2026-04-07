import type { StoryCondition } from "./types";

/** Every condition must pass (implicit AND). Empty / undefined passes. */
export function storyConditionsPass(
  conditions: StoryCondition[] | undefined,
  flags: Readonly<Record<string, boolean | undefined>>,
): boolean {
  if (!conditions?.length) return true;
  return conditions.every((c) => {
    if (c.type === "has_flag") return !!flags[c.key];
    if (c.type === "missing_flag") return !flags[c.key];
    return true;
  });
}
