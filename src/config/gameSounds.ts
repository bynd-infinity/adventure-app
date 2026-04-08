import type { RoomId } from "@/lib/story/rooms";

/** Static WAV paths under `public/sounds` (from audio lab export). */
export const SOUNDS = {
  uiConfirm: "/sounds/ui-confirm.wav",
  uiCancel: "/sounds/ui-cancel.wav",
  uiReady: "/sounds/ui-ready.wav",
  uiStartGame: "/sounds/ui-start-game.wav",

  explorationDecisionPick: "/sounds/exploration-decision-pick.wav",
  explorationDecisionLock: "/sounds/exploration-decision-lock.wav",
  explorationRoll: "/sounds/exploration-roll.wav",
  explorationSuccess: "/sounds/exploration-success.wav",
  explorationFail: "/sounds/exploration-fail.wav",
  roomEnter: "/sounds/room-enter.wav",
  clueUnlock: "/sounds/clue-unlock.wav",
  metaVillainSting: "/sounds/meta-villain-sting.wav",

  combatEncounterStart: "/sounds/combat-encounter-start.wav",
  combatPlayerSwing: "/sounds/combat-player-swing.wav",
  combatHit: "/sounds/combat-hit.wav",
  combatMiss: "/sounds/combat-miss.wav",
  combatCrit: "/sounds/combat-crit.wav",
  combatEnemyWindup: "/sounds/combat-enemy-windup.wav",
  combatEnemyHit: "/sounds/combat-enemy-hit.wav",
  combatVictory: "/sounds/combat-victory.wav",
  combatDefeat: "/sounds/combat-defeat.wav",

  itemTonic: "/sounds/item-tonic.wav",
  itemBalm: "/sounds/item-balm.wav",
  itemRest: "/sounds/item-rest.wav",

  musicTitle: "/sounds/music-title-loop.wav",
  musicLobby: "/sounds/music-lobby-loop.wav",
  musicCombat: "/sounds/music-combat-loop.wav",
  musicBoss: "/sounds/music-boss-loop.wav",
} as const;

export const ROOM_AMBIENT: Record<RoomId, string> = {
  entrance_hall: "/sounds/ambient-entrance.wav",
  registry_gallery: "/sounds/ambient-registry.wav",
  library: "/sounds/ambient-library.wav",
  servants_corridor: "/sounds/ambient-servants.wav",
  dining_room: "/sounds/ambient-dining.wav",
  boss_room: "/sounds/ambient-boss.wav",
};
