import type { Enemy } from "@/types";
import {
  combineRollModes,
  type RollMode,
} from "@/lib/game/statRolls";

/** Player attack roll mode vs this enemy (fragile → easier; defensive / spectral → harder). */
export function playerAttackRollMode(enemy: Enemy): RollMode {
  const adv = enemy.behavior === "fragile";
  const disadv =
    enemy.behavior === "defensive" || enemy.traitTag === "spectral";
  return combineRollModes(adv, disadv);
}
