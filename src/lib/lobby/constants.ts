export const PLAYER_CLASSES = ["Blade", "Spark", "Shadow", "Guard"] as const;

export type PlayerClassId = (typeof PLAYER_CLASSES)[number];

export function isValidPlayerClass(value: string): value is PlayerClassId {
  return (PLAYER_CLASSES as readonly string[]).includes(value);
}
