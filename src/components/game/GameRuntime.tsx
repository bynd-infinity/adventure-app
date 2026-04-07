"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Enemy, GameState, Player } from "@/types";
import { characterPortraitSrc } from "@/config/characters";
import { playerAttackRollMode } from "@/lib/game/combatAdvantage";
import {
  applyIncomingDamageToEnemy,
  enemyAttackRollModifier,
  enemyAttackUsesDisadvantage,
  generateEncounter,
  pickEnemyTargetPlayerIndex,
} from "@/lib/game/enemies";
import { explorationHasAdvantage } from "@/lib/game/explorationAdvantage";
import { pickRandomReward } from "@/lib/game/rewards";
import { HAUNTED_HOUSE_JOURNAL_ENTRIES } from "@/config/story/hauntedHouseJournal";
import {
  hauntedHouseEntrance,
  metaVillainEffects,
} from "@/config/story/hauntedHouse";
import { getStoryScene } from "@/lib/story/engine";
import {
  applyStandaloneMetaEffects,
  processStoryEffects,
  type ProcessedStoryEffects,
} from "@/lib/story/effects";
import { initialRpgStatsForClass } from "@/lib/game/classStats";
import {
  resolveExplorationAction,
  type ExplorationActionKind,
} from "@/lib/game/explorationResolve";
import {
  combineRollModes,
  combatTierPrefix,
  formatStatRollSuffixWithMode,
  outcomeTierFromTotal,
  rollWithStatAndMode,
  type OutcomeTier,
} from "@/lib/game/statRolls";
import type { StoryResultNext } from "@/lib/story/types";
import { ActionBar } from "./ActionBar";
import { JournalPanel } from "./JournalPanel";
import { EnemyPanel } from "./EnemyPanel";
import { GameTopBar } from "./GameTopBar";
import { PartyPanel } from "./PartyPanel";
import { SceneStage } from "./SceneStage";

type GameRuntimeProps = {
  initialGameState: GameState;
};

type PlayerGameState = Player & {
  maxHp: number;
  power: number;
  guard: number;
  mind: number;
  skill: number;
};

type LocalGameState = {
  scene: RoomId;
  players: PlayerGameState[];
  enemies: Enemy[];
  turnIndex: number;
  phase: "player" | "enemy";
};

type EncounterStatus = "active" | "victory" | "defeat";
type SceneStageMode =
  | "intro"
  | "action"
  | "outcome"
  | "choice"
  | "combat"
  | "result";
type ResultNext = StoryResultNext;
type ChoiceMode = "room_action" | "room_select";
type RoomId = "entrance_hall" | "library" | "dining_room" | "boss_room";

type ResultCard = {
  title: string;
  message: string;
  cta: string;
  next: ResultNext;
};

/** Local pacing: multiple interactions per room; combat must be won if it started. */
type RoomPacingState = {
  interactionCount: number;
  combatTriggered: boolean;
  combatResolved: boolean;
  /** Action categories used at least once this visit (exploration telemetry). */
  usedSearch: boolean;
  usedInspect: boolean;
  usedListen: boolean;
};

function initialRoomPacing(): RoomPacingState {
  return {
    interactionCount: 0,
    combatTriggered: false,
    combatResolved: false,
    usedSearch: false,
    usedInspect: false,
    usedListen: false,
  };
}

function roomExitCriteriaMet(p: RoomPacingState): boolean {
  return p.interactionCount >= 2 && (!p.combatTriggered || p.combatResolved);
}

const COMBAT_WIN_MID_ROOM: ResultCard = {
  title: "Encounter Over",
  message: "Your foes fall quiet. The space around you is not yet spent.",
  cta: "Return to Room",
  next: "explore_more",
};

const BASE_DAMAGE = 5;
const DAMAGE_VARIANCE = 2;

const ROOM_LABELS: Record<RoomId, string> = {
  entrance_hall: "Entrance Hall",
  library: "Library",
  dining_room: "Dining Room",
  boss_room: "Boss Room",
};

const ROOM_BACKGROUNDS: Record<RoomId, string> = {
  entrance_hall: "/backgrounds/entrance-hall.png",
  library: "/backgrounds/library.png",
  dining_room: "/backgrounds/dining-room.png",
  boss_room: "/backgrounds/boss-room.png",
};

const ROOM_INTRO: Record<RoomId, string> = {
  entrance_hall: "A dying chandelier swings overhead as the haunted house exhales.",
  library: "Tall shelves loom in silence while pages whisper in the dark.",
  dining_room: "A long table waits beneath tarnished silver and dust-choked air.",
  boss_room: "At the heart of the house, chains rattle around an ancient altar.",
};

function initLocalState(initial: GameState): LocalGameState {
  return {
    scene: "entrance_hall",
    players: initial.players.map((p) => {
      const s = initialRpgStatsForClass(p.class);
      return {
        ...p,
        maxHp: p.hp,
        power: s.power,
        guard: s.guard,
        mind: s.mind,
        skill: s.skill,
      };
    }),
    enemies: initial.enemies,
    turnIndex: initial.turnIndex,
    phase: initial.phase,
  };
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function clampHp(hp: number): number {
  return Math.max(0, hp);
}

function getLivingPlayers(state: LocalGameState) {
  return state.players.filter((p) => p.hp > 0);
}

function getLivingEnemies(state: LocalGameState) {
  return state.enemies.filter((e) => e.hp > 0);
}

function getFirstLivingPlayerIndex(state: LocalGameState): number | null {
  const idx = state.players.findIndex((p) => p.hp > 0);
  return idx >= 0 ? idx : null;
}

function getFirstLivingEnemy(state: LocalGameState) {
  return state.enemies.find((e) => e.hp > 0) ?? null;
}

function getNextLivingPlayerIndex(state: LocalGameState, fromIndex: number): number | null {
  for (let i = fromIndex + 1; i < state.players.length; i++) {
    if ((state.players[i]?.hp ?? 0) > 0) return i;
  }
  return null;
}

/** Enemy attack roll total vs old hit thresholds (unchanged). */
function resolveAttackDamage(
  attackTotal: number,
  critBonus: number,
  strongBonus: number,
  baseDamage: number = BASE_DAMAGE,
): {
  damage: number;
  outcome: "miss" | "hit" | "strong" | "critical";
} {
  if (attackTotal >= 19) {
    return {
      outcome: "critical",
      damage:
        baseDamage + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + critBonus,
    };
  }
  if (attackTotal >= 13) {
    return {
      outcome: "strong",
      damage:
        baseDamage + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + strongBonus,
    };
  }
  if (attackTotal >= 6) {
    return {
      outcome: "hit",
      damage: baseDamage + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE,
    };
  }
  return { outcome: "miss", damage: 0 };
}

function resolvePlayerAttackByTier(
  tier: OutcomeTier,
  power: number,
): { damage: number; outcome: "miss" | "hit" | "strong" | "critical" } {
  if (tier === "fail") return { damage: 0, outcome: "miss" };
  const variance = rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE;
  const base = BASE_DAMAGE + variance;
  if (tier === "success") {
    return { damage: Math.max(1, base), outcome: "hit" };
  }
  if (tier === "strong") {
    return {
      damage: base + 3 + Math.min(2, Math.floor(power / 2)),
      outcome: "strong",
    };
  }
  return { damage: base + 6 + power, outcome: "critical" };
}

function rewardNarrationLabel(rewardId: string): string {
  if (rewardId === "heal_small") return "Your wounds close.";
  if (rewardId === "hp_up") return "Vital force settles in your bones.";
  if (rewardId === "power_up") return "You feel stronger.";
  if (rewardId === "guard_up") return "Your body hardens.";
  if (rewardId === "mind_up") return "Your thoughts sharpen.";
  return "Your movements grow faster.";
}

export function GameRuntime({ initialGameState }: GameRuntimeProps) {
  const router = useRouter();
  const [gameState, setGameState] = useState<LocalGameState>(() =>
    initLocalState(initialGameState),
  );
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>("active");
  const [sceneStage, setSceneStage] = useState<SceneStageMode>("intro");
  const [choiceMode, setChoiceMode] = useState<ChoiceMode>("room_action");
  const [currentRoom, setCurrentRoom] = useState<RoomId>("entrance_hall");
  const [completedRooms, setCompletedRooms] = useState<RoomId[]>([]);
  const [resultCard, setResultCard] = useState<ResultCard | null>(null);
  const [narrationLog, setNarrationLog] = useState<string[]>(() => {
    const intro = getStoryScene(
      hauntedHouseEntrance,
      hauntedHouseEntrance.initialSceneId,
    );
    return [intro?.type === "intro" ? intro.text : ROOM_INTRO.entrance_hall];
  });
  const [roomPacing, setRoomPacing] = useState<RoomPacingState>(initialRoomPacing);
  const [entranceStorySceneId, setEntranceStorySceneId] = useState(
    hauntedHouseEntrance.initialSceneId,
  );
  const [storyClues, setStoryClues] = useState<string[]>([]);
  const [storyCombatResumeSceneId, setStoryCombatResumeSceneId] = useState<
    string | null
  >(null);
  const [metaNarration, setMetaNarration] = useState<string | null>(null);
  const metaOnceKeysRef = useRef<Set<string>>(new Set());
  const [storyFlags, setStoryFlags] = useState<Record<string, boolean>>({});
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalToast, setJournalToast] = useState<string | null>(null);
  const prevJournalUnlockCountRef = useRef(0);
  const [outcomeOverlay, setOutcomeOverlay] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const discoveredJournalEntries = useMemo(
    () =>
      HAUNTED_HOUSE_JOURNAL_ENTRIES.filter((e) => storyFlags[e.unlockFlag]).map(
        ({ id, title, text }) => ({ id, title, text }),
      ),
    [storyFlags],
  );

  useEffect(() => {
    const n = discoveredJournalEntries.length;
    if (n > prevJournalUnlockCountRef.current) {
      prevJournalUnlockCountRef.current = n;
      const raf = requestAnimationFrame(() => {
        setJournalToast("Clue added");
      });
      const t = window.setTimeout(() => setJournalToast(null), 2600);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }
    prevJournalUnlockCountRef.current = n;
    return undefined;
  }, [discoveredJournalEntries.length]);

  useEffect(() => {
    if (!metaNarration) return;
    const t = window.setTimeout(() => setMetaNarration(null), 4200);
    return () => window.clearTimeout(t);
  }, [metaNarration]);

  function pushNarration(line: string) {
    setNarrationLog((prev) => [line, ...prev].slice(0, 4));
  }

  function markRoomComplete(room: RoomId) {
    setCompletedRooms((prev) => (prev.includes(room) ? prev : [...prev, room]));
  }

  function roomCompletionCard(room: RoomId): ResultCard {
    if (room === "entrance_hall") {
      return {
        title: "Entrance Cleared",
        message: "You survived the hall. Choose which wing to explore next.",
        cta: "Leave Room",
        next: "room_select",
      };
    }

    if (room === "boss_room") {
      return {
        title: "Run Complete",
        message: "The Bound Spirit is broken. The haunted house falls silent.",
        cta: "Return to Menu",
        next: "run_complete",
      };
    }

    return {
      title: `${ROOM_LABELS[room]} Cleared`,
      message: "You can press onward through the haunted estate.",
      cta: "Leave Room",
      next: "room_select",
    };
  }

  function grantRandomRewardThenShowResult(
    targetPlayerId: string,
    nextCard: ResultCard,
  ) {
    const reward = pickRandomReward();
    setGameState((prev) => {
      const fallbackIndex = getFirstLivingPlayerIndex(prev) ?? 0;
      let idx = prev.players.findIndex((p) => p.id === targetPlayerId);
      if (idx < 0 || (prev.players[idx]?.hp ?? 0) <= 0) {
        idx = fallbackIndex;
      }
      const target = prev.players[idx];
      if (!target) return prev;
      const updated = reward.apply({
        hp: target.hp,
        maxHp: target.maxHp,
        power: target.power,
        guard: target.guard,
        mind: target.mind,
        skill: target.skill,
      });
      return {
        ...prev,
        players: prev.players.map((p, i) =>
          i === idx
            ? {
                ...p,
                hp: clampHp(Math.min(updated.hp, updated.maxHp)),
                maxHp: updated.maxHp,
                power: updated.power,
                guard: updated.guard,
                mind: updated.mind,
                skill: updated.skill,
              }
            : p,
        ),
      };
    });

    pushNarration(rewardNarrationLabel(reward.id));

    const rewardMeta = applyStandaloneMetaEffects(
      [metaVillainEffects.afterFirstReward],
      {
        canExitRoom: false,
        usedMetaOnceKeys: metaOnceKeysRef.current,
      },
    );
    if (rewardMeta) {
      setMetaNarration(rewardMeta);
    }

    setResultCard(nextCard);
    setSceneStage("result");
  }

  function enterRoom(room: RoomId) {
    setCurrentRoom(room);
    setChoiceMode("room_action");
    setOutcomeOverlay(null);
    setSceneStage("intro");
    setEncounterStatus("active");
    setRoomPacing(initialRoomPacing());
    setStoryCombatResumeSceneId(null);
    if (room === "entrance_hall") {
      setEntranceStorySceneId(hauntedHouseEntrance.initialSceneId);
    }
    setResultCard(null);
    setGameState((prev) => ({
      ...prev,
      scene: room,
      enemies: [],
      phase: "player",
      turnIndex: getFirstLivingPlayerIndex(prev) ?? 0,
    }));
    if (room === "entrance_hall") {
      const intro = getStoryScene(
        hauntedHouseEntrance,
        hauntedHouseEntrance.initialSceneId,
      );
      pushNarration(intro?.type === "intro" ? intro.text : ROOM_INTRO[room]);
    } else {
      pushNarration(ROOM_INTRO[room]);
    }
  }

  function beginRoomCombat(
    room: RoomId,
    opts?: { entranceResumeSceneId?: string },
  ) {
    setRoomPacing((p) => ({ ...p, combatTriggered: true }));
    if (room === "entrance_hall" && opts?.entranceResumeSceneId) {
      setStoryCombatResumeSceneId(opts.entranceResumeSceneId);
    } else if (room !== "entrance_hall") {
      setStoryCombatResumeSceneId(null);
    }
    const enemies = generateEncounter(room);
    setSceneStage("combat");
    setEncounterStatus("active");
    setGameState((prev) => ({
      ...prev,
      scene: room,
      enemies,
      phase: "player",
      turnIndex: getFirstLivingPlayerIndex(prev) ?? 0,
    }));
  }

  function applyProcessedStoryOutcome(proc: ProcessedStoryEffects): boolean {
    if (proc.flagClears.length > 0 || proc.flagSets.length > 0) {
      setStoryFlags((prev) => {
        const next = { ...prev };
        for (const k of proc.flagClears) {
          delete next[k];
        }
        for (const k of proc.flagSets) {
          next[k] = true;
        }
        return next;
      });
    }

    if (proc.metaMessage) {
      setMetaNarration(proc.metaMessage);
    }

    if (proc.clueIds.length > 0) {
      setStoryClues((prev) => [...prev, ...proc.clueIds]);
    }

    if (proc.healFirstLiving > 0) {
      const idx = getFirstLivingPlayerIndex(gameState);
      if (idx !== null) {
        setGameState((prev) => ({
          ...prev,
          players: prev.players.map((p, i) =>
            i === idx
              ? {
                  ...p,
                  hp: clampHp(Math.min(p.maxHp, p.hp + proc.healFirstLiving)),
                }
              : p,
          ),
        }));
      }
    }

    if (proc.damageFirstLiving > 0) {
      const firstLiving = getFirstLivingPlayerIndex(gameState);
      if (firstLiving !== null) {
        const nextPlayers = gameState.players.map((player, idx) =>
          idx === firstLiving
            ? { ...player, hp: clampHp(player.hp - proc.damageFirstLiving) }
            : player,
        );
        const livingAfterPenalty = nextPlayers.filter((p) => p.hp > 0);
        setGameState((prev) => ({ ...prev, players: nextPlayers }));

        if (livingAfterPenalty.length === 0) {
          setEncounterStatus("defeat");
          setResultCard({
            title: "Defeat",
            message: "The room drains your final strength before battle begins.",
            cta: "Retry (Soon)",
            next: "stay",
          });
          setSceneStage("result");
          return true;
        }
      }
    }

    if (proc.navigateToSceneId) {
      const rs = getStoryScene(hauntedHouseEntrance, proc.navigateToSceneId);
      if (rs?.type === "result") {
        setResultCard({
          title: rs.title,
          message: rs.text,
          cta: rs.cta,
          next: rs.resultNext,
        });
        setSceneStage("result");
      }
      return true;
    }

    if (proc.grantReward) {
      if (proc.grantReward.markRoomComplete) {
        markRoomComplete(proc.grantReward.markRoomComplete);
      }
      grantRandomRewardThenShowResult(
        activePlayer?.id ?? gameState.players[0]?.id ?? "",
        proc.grantReward.completionCard,
      );
      return true;
    }

    if (proc.combat) {
      beginRoomCombat(proc.combat.room, {
        entranceResumeSceneId: proc.combat.resumeSceneId,
      });
      return true;
    }

    return false;
  }

  const activePlayerIndex =
    gameState.players[gameState.turnIndex]?.hp > 0
      ? gameState.turnIndex
      : getFirstLivingPlayerIndex(gameState);
  const activePlayer =
    activePlayerIndex === null ? null : gameState.players[activePlayerIndex];

  function handleExplorationAction(action: ExplorationActionKind) {
    if (sceneStage !== "action" || choiceMode !== "room_action") return;
    if (!activePlayer) return;

    const pacingAfter: RoomPacingState = {
      ...roomPacing,
      interactionCount: roomPacing.interactionCount + 1,
      usedSearch: action === "search" ? true : roomPacing.usedSearch,
      usedInspect: action === "inspect" ? true : roomPacing.usedInspect,
      usedListen: action === "listen" ? true : roomPacing.usedListen,
    };
    setRoomPacing(pacingAfter);

    const stat =
      action === "search"
        ? activePlayer.skill
        : action === "inspect"
          ? activePlayer.mind
          : activePlayer.guard;
    const explorationAdv = explorationHasAdvantage(
      activePlayer.class,
      action,
      currentRoom,
      storyFlags,
      pacingAfter,
    );
    const rollMode = combineRollModes(explorationAdv, false);
    const { d20, d20Other, total } = rollWithStatAndMode(stat, rollMode);
    const tier = outcomeTierFromTotal(total);
    const rs = formatStatRollSuffixWithMode(
      rollMode,
      d20,
      d20Other,
      stat,
      total,
    );
    const canExitNow = roomExitCriteriaMet(pacingAfter);

    const output = resolveExplorationAction(
      currentRoom,
      action,
      tier,
      storyFlags,
      pacingAfter,
      rs,
    );

    const proc = processStoryEffects(output.effects, {
      canExitRoom: canExitNow,
      usedMetaOnceKeys: metaOnceKeysRef.current,
    });

    if (proc.combat != null || proc.grantReward != null) {
      pushNarration(output.outcomeMessage);
    }

    const consumed = applyProcessedStoryOutcome(proc);
    if (!consumed) {
      pushNarration(output.outcomeMessage);
      setOutcomeOverlay({
        title: output.outcomeTitle,
        message: output.outcomeMessage,
      });
      setSceneStage("outcome");
    }
  }

  function handleOutcomeContinue() {
    setOutcomeOverlay(null);
    setSceneStage("action");
  }

  function handleLeaveExploredRoom() {
    if (sceneStage !== "action" || choiceMode !== "room_action") return;
    if (!roomExitCriteriaMet(roomPacing)) return;
    if (currentRoom === "boss_room") return;

    const pacingAfter: RoomPacingState = {
      ...roomPacing,
      interactionCount: roomPacing.interactionCount + 1,
    };
    setRoomPacing(pacingAfter);

    const pid = activePlayer?.id ?? gameState.players[0]?.id ?? "";

    if (currentRoom === "entrance_hall") {
      const proc = processStoryEffects(
        [
          metaVillainEffects.entranceCleared,
          {
            type: "grant_reward",
            markRoomComplete: "entrance_hall",
            completionCard: {
              title: "A Hollow Discovery",
              message: "Nothing stirs here. Another wing calls to you.",
              cta: "Leave Room",
              next: "room_select",
            },
          },
        ],
        {
          canExitRoom: true,
          usedMetaOnceKeys: metaOnceKeysRef.current,
        },
      );
      applyProcessedStoryOutcome(proc);
      return;
    }

    if (currentRoom === "library") {
      markRoomComplete("library");
      grantRandomRewardThenShowResult(pid, roomCompletionCard("library"));
      return;
    }

    if (currentRoom === "dining_room") {
      markRoomComplete("dining_room");
      grantRandomRewardThenShowResult(pid, roomCompletionCard("dining_room"));
    }
  }

  function handleOpenBossBindingChoices() {
    if (currentRoom !== "boss_room" || sceneStage !== "action") return;
    if (roomPacing.interactionCount < 2) return;
    setSceneStage("choice");
  }

  function resolveAllEnemyTurns(stateAfterPlayers: LocalGameState): {
    nextState: LocalGameState;
    enemyNarrations: string[];
  } {
    const enemyOrder = getLivingEnemies(stateAfterPlayers);
    if (enemyOrder.length === 0) {
      return {
        nextState: { ...stateAfterPlayers, phase: "player" },
        enemyNarrations: ["Silence. No enemies remain."],
      };
    }

    let current = stateAfterPlayers;
    const enemyNarrations: string[] = [];

    for (const enemyRef of enemyOrder) {
      if (getLivingPlayers(current).length === 0) break;

      const enemy = current.enemies.find((e) => e.id === enemyRef.id && e.hp > 0);
      if (!enemy) continue;

      const targetIndex = pickEnemyTargetPlayerIndex(current.players, enemy.behavior);
      if (targetIndex === null) {
        enemyNarrations.push(`${enemy.name} finds no living target.`);
        break;
      }

      const target = current.players[targetIndex]!;
      const mod = enemyAttackRollModifier(enemy.behavior);
      let attackTotal: number;
      let rollNote: string;
      if (enemyAttackUsesDisadvantage(enemy.behavior)) {
        const d1 = rollDie(20);
        const d2 = rollDie(20);
        const lowD = Math.min(d1, d2);
        const highD = Math.max(d1, d2);
        attackTotal = lowD + mod;
        rollNote = `d20 ${lowD}/${highD} dis + ${mod} = ${attackTotal}`;
      } else {
        const d = rollDie(20);
        attackTotal = d + mod;
        rollNote = `${attackTotal}`;
      }
      const { damage, outcome } = resolveAttackDamage(
        attackTotal,
        2,
        0,
        enemy.baseDamage,
      );
      const reduced = Math.max(0, damage - target.guard);
      const nextHp = clampHp(target.hp - reduced);
      const nextPlayers = current.players.map((p, idx) =>
        idx === targetIndex ? { ...p, hp: nextHp } : p,
      );

      const firstLivingAfter = nextPlayers.findIndex((p) => p.hp > 0);

      const outcomeText =
        outcome === "miss"
          ? "misses"
          : outcome === "critical"
            ? `lands a brutal strike for ${reduced}`
            : `hits for ${reduced}`;

      const defeatedText = nextHp === 0 ? ` ${target.name} collapses.` : "";

      enemyNarrations.push(
        `${enemy.name} rolls ${rollNote} and ${outcomeText} ${target.name}.${defeatedText}`,
      );

      current = {
        ...current,
        players: nextPlayers,
        phase: "player",
        turnIndex: firstLivingAfter === -1 ? 0 : firstLivingAfter,
      };
    }

    const aliveIdx = getFirstLivingPlayerIndex(current);
    return {
      nextState: {
        ...current,
        phase: "player",
        turnIndex: aliveIdx === null ? 0 : aliveIdx,
      },
      enemyNarrations,
    };
  }

  function applyRiskPenaltyThenCombat(room: RoomId, penalty: number, line: string) {
    const firstLiving = getFirstLivingPlayerIndex(gameState);

    if (firstLiving !== null) {
      const nextPlayers = gameState.players.map((player, idx) =>
        idx === firstLiving ? { ...player, hp: clampHp(player.hp - penalty) } : player,
      );

      const livingAfterPenalty = nextPlayers.filter((p) => p.hp > 0);
      setGameState((prev) => ({ ...prev, players: nextPlayers }));
      pushNarration(line);

      if (livingAfterPenalty.length === 0) {
        setEncounterStatus("defeat");
        setResultCard({
          title: "Defeat",
          message: "The room drains your final strength before battle begins.",
          cta: "Retry (Soon)",
          next: "stay",
        });
        setSceneStage("result");
        return;
      }
    }

    beginRoomCombat(room);
  }

  function handleAttack() {
    if (
      !activePlayer ||
      gameState.phase !== "player" ||
      encounterStatus !== "active" ||
      sceneStage !== "combat"
    ) {
      return;
    }

    const target = getFirstLivingEnemy(gameState);
    if (!target) {
      pushNarration(`${activePlayer.name} lowers their weapon. No foes remain.`);
      return;
    }

    const attackMode = playerAttackRollMode(target);
    const { d20, d20Other, total } = rollWithStatAndMode(
      activePlayer.power,
      attackMode,
    );
    const tier = outcomeTierFromTotal(total);
    const { damage, outcome } = resolvePlayerAttackByTier(tier, activePlayer.power);
    const rawHit = Math.max(0, damage + activePlayer.power - 1);
    const finalDamage = applyIncomingDamageToEnemy(target, rawHit);

    const nextEnemyHp = target.hp - finalDamage;
    const encounterCleared =
      nextEnemyHp <= 0 && getLivingEnemies(gameState).length === 1;
    const nextPlayerIndex = getNextLivingPlayerIndex(gameState, activePlayerIndex ?? 0);
    const enemyWillAct = nextPlayerIndex === null && !encounterCleared;

    setGameState((prev) => {
      const currentEnemy = getFirstLivingEnemy(prev);
      if (!currentEnemy) return prev;

      const nextHp = clampHp(currentEnemy.hp - finalDamage);
      const nextEnemies =
        nextHp <= 0
          ? prev.enemies.filter((e) => e.id !== currentEnemy.id)
          : prev.enemies.map((e) =>
              e.id === currentEnemy.id ? { ...e, hp: nextHp } : e,
            );

      const afterPlayerAttack: LocalGameState = {
        ...prev,
        enemies: nextEnemies,
        turnIndex: nextPlayerIndex ?? prev.turnIndex,
        phase: nextPlayerIndex === null && nextEnemies.length > 0 ? "enemy" : "player",
      };

      if (afterPlayerAttack.phase === "enemy") {
        const enemyTurn = resolveAllEnemyTurns(afterPlayerAttack);
        for (const line of enemyTurn.enemyNarrations) {
          pushNarration(line);
        }
        if (getLivingPlayers(enemyTurn.nextState).length === 0) {
          setEncounterStatus("defeat");
          setResultCard({
            title: "Defeat",
            message: "Your party has fallen in the haunted hall.",
            cta: "Retry (Soon)",
            next: "stay",
          });
          setSceneStage("result");
        }
        return enemyTurn.nextState;
      }

      return afterPlayerAttack;
    });

    if (enemyWillAct) return;

    if (outcome === "miss") {
      pushNarration(
        `${combatTierPrefix("fail")} ${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`,
      );
      return;
    }

    if (encounterCleared) {
      setEncounterStatus("victory");
      const pacingAfterWin: RoomPacingState = {
        ...roomPacing,
        combatResolved: true,
      };
      setRoomPacing(pacingAfterWin);
      if (currentRoom === "entrance_hall") {
        setEntranceStorySceneId(storyCombatResumeSceneId ?? "eh_hub");
        setStoryCombatResumeSceneId(null);
      }
      const canLeaveRoom = roomExitCriteriaMet(pacingAfterWin);

      const combatMeta = applyStandaloneMetaEffects(
        [metaVillainEffects.afterFirstCombatWin],
        {
          canExitRoom: canLeaveRoom,
          usedMetaOnceKeys: metaOnceKeysRef.current,
        },
      );
      if (combatMeta) {
        setMetaNarration(combatMeta);
      }

      pushNarration(
        `${combatTierPrefix(tier)} ${activePlayer.name} strikes ${target.name} for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`,
      );
      if (canLeaveRoom) {
        markRoomComplete(currentRoom);
        grantRandomRewardThenShowResult(
          activePlayer.id,
          roomCompletionCard(currentRoom),
        );
      } else {
        grantRandomRewardThenShowResult(activePlayer.id, COMBAT_WIN_MID_ROOM);
      }
      return;
    }

    if (outcome === "critical") {
      pushNarration(
        `${combatTierPrefix(tier)} ${activePlayer.name} drives a brutal strike into ${target.name} for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`,
      );
      return;
    }
    if (outcome === "strong") {
      pushNarration(
        `${combatTierPrefix(tier)} ${activePlayer.name} hits ${target.name} hard for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`,
      );
      return;
    }
    pushNarration(
      `${combatTierPrefix(tier)} ${activePlayer.name} hits ${target.name} for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`,
    );
  }

  function handleBeginExploration() {
    setChoiceMode("room_action");
    setOutcomeOverlay(null);
    setSceneStage("action");
    if (currentRoom === "entrance_hall") {
      const intro = getStoryScene(hauntedHouseEntrance, entranceStorySceneId);
      if (intro?.type === "intro") {
        setEntranceStorySceneId(intro.nextSceneId);
        const hub = getStoryScene(hauntedHouseEntrance, intro.nextSceneId);
        if (hub?.type === "action" && hub.text) {
          pushNarration(`${ROOM_LABELS.entrance_hall}: ${hub.text}`);
        } else {
          pushNarration(`${ROOM_LABELS.entrance_hall}: choose an action.`);
        }
        return;
      }
    }
    pushNarration(`${ROOM_LABELS[currentRoom]}: choose an action.`);
  }

  function handleRoomActionChoice(choiceId: string) {
    if (sceneStage !== "choice" || choiceMode !== "room_action") return;

    if (currentRoom === "boss_room") {
      if (choiceId === "seal") {
        pushNarration("You break the seal. The Bound Spirit tears free.");
        beginRoomCombat("boss_room");
        return;
      }
      if (choiceId === "script") {
        pushNarration("The warding script is incomplete and fails to bind the spirit.");
        setResultCard({
          title: "Shattered Wards",
          message: "Ancient ink flakes away. The confrontation is inevitable.",
          cta: "Continue Exploring",
          next: "explore_more",
        });
        setSceneStage("result");
        return;
      }
      applyRiskPenaltyThenCombat(
        "boss_room",
        3,
        "You touch the spirit chain. Cold fire burns you for 3 HP.",
      );
      return;
    }
  }

  function handleRoomSelectChoice(nextRoom: RoomId) {
    if (sceneStage !== "choice" || choiceMode !== "room_select") return;
    if (nextRoom === "boss_room") {
      setStoryFlags((prev) => ({ ...prev, journal_boss_warning: true }));
      const ctx = {
        canExitRoom: false,
        usedMetaOnceKeys: metaOnceKeysRef.current,
      };
      const bossMeta = storyFlags.found_letter_fragment
        ? applyStandaloneMetaEffects([metaVillainEffects.bossLetterReveal], ctx)
        : applyStandaloneMetaEffects([metaVillainEffects.beforeBossRoom], ctx);
      if (bossMeta) {
        setMetaNarration(bossMeta);
      }
    }
    enterRoom(nextRoom);
  }

  function handleResultContinue() {
    if (!resultCard) return;
    if (encounterStatus === "defeat") return;

    const next = resultCard.next;
    setResultCard(null);

    if (next === "explore_more" || next === "choice") {
      setChoiceMode("room_action");
      setOutcomeOverlay(null);
      setSceneStage("action");
      setEncounterStatus("active");
      if (currentRoom === "entrance_hall") {
        setEntranceStorySceneId("eh_hub");
      }
      return;
    }

    if (next === "room_select") {
      setEncounterStatus("active");
      setChoiceMode("room_select");
      setSceneStage("choice");
      return;
    }

    if (next === "run_complete") {
      router.push("/");
    }
  }

  function handlePlayAgain() {
    setCurrentRoom("entrance_hall");
    setChoiceMode("room_action");
    setOutcomeOverlay(null);
    setSceneStage("intro");
    setEncounterStatus("active");
    setCompletedRooms([]);
    setRoomPacing(initialRoomPacing());
    setEntranceStorySceneId(hauntedHouseEntrance.initialSceneId);
    setStoryClues([]);
    setStoryCombatResumeSceneId(null);
    metaOnceKeysRef.current.clear();
    setMetaNarration(null);
    setStoryFlags({});
    setJournalOpen(false);
    setJournalToast(null);
    prevJournalUnlockCountRef.current = 0;
    setResultCard(null);
    setGameState(initLocalState(initialGameState));
    setNarrationLog(() => {
      const intro = getStoryScene(
        hauntedHouseEntrance,
        hauntedHouseEntrance.initialSceneId,
      );
      return [intro?.type === "intro" ? intro.text : ROOM_INTRO.entrance_hall];
    });
  }

  const showCombatLayer = sceneStage === "combat";
  const showIntroLayer = sceneStage === "intro";
  const showActionLayer =
    sceneStage === "action" && choiceMode === "room_action";
  const showOutcomeLayer =
    sceneStage === "outcome" &&
    choiceMode === "room_action" &&
    outcomeOverlay !== null;
  const showChoiceLayer =
    sceneStage === "choice" &&
    (choiceMode === "room_select" ||
      (choiceMode === "room_action" && currentRoom === "boss_room"));
  const showResultLayer = sceneStage === "result" && !!resultCard;
  const mutedHud = !showCombatLayer;

  const bossBindingChoices: { id: string; label: string }[] = [
    { id: "seal", label: "Break the binding seal" },
    { id: "script", label: "Read the warding script" },
    { id: "chain", label: "Touch the spirit chain" },
  ];

  const canLeaveExploredRoom =
    currentRoom !== "boss_room" && roomExitCriteriaMet(roomPacing);

  const wingCleared =
    completedRooms.includes("library") || completedRooms.includes("dining_room");
  const availableRoomOptions: { id: RoomId; label: string }[] = [];
  if (!completedRooms.includes("library")) {
    availableRoomOptions.push({ id: "library", label: "Go to Library" });
  }
  if (!completedRooms.includes("dining_room")) {
    availableRoomOptions.push({ id: "dining_room", label: "Go to Dining Room" });
  }
  if (wingCleared) {
    availableRoomOptions.push({ id: "boss_room", label: "Enter Boss Room" });
  }

  const backgroundStyle =
    currentRoom === "boss_room"
      ? "url('/backgrounds/boss-room.png'), url('/backgrounds/entrance-hall.png')"
      : `url('${ROOM_BACKGROUNDS[currentRoom]}')`;

  const entranceIntroScene = getStoryScene(
    hauntedHouseEntrance,
    entranceStorySceneId,
  );

  return (
    <div
      className="relative flex min-h-screen flex-1 flex-col bg-zinc-950 bg-cover bg-center bg-no-repeat text-zinc-100"
      style={{ backgroundImage: backgroundStyle }}
      data-story-clues={storyClues.length}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
      {metaNarration ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-[11%] z-[55] max-w-sm -translate-x-1/2 px-4 text-center"
        >
          <p className="rounded-md border border-amber-900/45 bg-zinc-950/80 px-3 py-2 text-xs font-medium italic leading-snug tracking-wide text-amber-100/85 shadow-[0_0_28px_rgba(251,191,36,0.14)] backdrop-blur-sm">
            {metaNarration}
          </p>
        </div>
      ) : null}
      {!journalOpen ? (
        <button
          type="button"
          onClick={() => setJournalOpen(true)}
          className="pointer-events-auto fixed right-0 top-[4.75rem] z-[53] rounded-l-md border border-violet-700/55 border-r-0 bg-zinc-950/92 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200 shadow-lg backdrop-blur-sm hover:bg-zinc-900/95"
        >
          Notes
        </button>
      ) : null}
      {journalToast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-3 top-[7.5rem] z-[54] rounded border border-zinc-600/35 bg-zinc-950/88 px-2 py-1 text-[10px] text-zinc-400"
        >
          {journalToast}
        </div>
      ) : null}
      <JournalPanel
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        entries={discoveredJournalEntries}
      />
      {process.env.NODE_ENV === "development" ? (
        <div className="pointer-events-none fixed bottom-2 left-2 z-[60] max-w-[14rem] rounded border border-zinc-600/40 bg-black/75 px-2 py-1 font-mono text-[10px] text-zinc-400">
          <div className="font-semibold uppercase tracking-wide text-zinc-500">
            story flags
          </div>
          <pre className="mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
            {Object.keys(storyFlags).length === 0
              ? "—"
              : JSON.stringify(storyFlags, null, 0)}
          </pre>
          <div className="mt-1 text-zinc-500">
            room: i={roomPacing.interactionCount} combat=
            {roomPacing.combatTriggered ? (roomPacing.combatResolved ? "done" : "on") : "no"}{" "}
            S/I/L
            {roomPacing.usedSearch ? "1" : "0"}
            {roomPacing.usedInspect ? "1" : "0"}
            {roomPacing.usedListen ? "1" : "0"}
          </div>
        </div>
      ) : null}
      <div className="relative z-10 flex min-h-screen flex-1 flex-col pb-40">
        <GameTopBar scene={gameState.scene} phase={gameState.phase} />
        <PartyPanel
          players={gameState.players}
          activePlayerId={activePlayer?.id ?? null}
        />

        {showCombatLayer ? (
          <>
            <main className="flex flex-1 items-center justify-center">
              <EnemyPanel enemies={gameState.enemies} />
            </main>
            <SceneStage
              narrationLog={narrationLog}
              portraitSrc={
                activePlayer
                  ? characterPortraitSrc(activePlayer.class)
                  : null
              }
              portraitAlt={activePlayer?.name}
            />
          </>
        ) : (
          <main className="flex flex-1 items-center justify-center" />
        )}

        <div className={mutedHud ? "opacity-35" : undefined}>
          <ActionBar
            onAttack={handleAttack}
            attackDisabled={
              !activePlayer ||
              getLivingEnemies(gameState).length === 0 ||
              gameState.phase !== "player" ||
              encounterStatus !== "active" ||
              sceneStage !== "combat"
            }
          />
        </div>

        {showIntroLayer ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-6 text-center shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-violet-100">
                {currentRoom === "entrance_hall" && entranceIntroScene?.type === "intro"
                  ? entranceIntroScene.roomTitle
                  : ROOM_LABELS[currentRoom]}
              </h2>
              <p className="mt-3 text-sm text-zinc-300">
                {currentRoom === "entrance_hall" && entranceIntroScene?.type === "intro"
                  ? entranceIntroScene.text
                  : ROOM_INTRO[currentRoom]}
              </p>
              <button
                type="button"
                onClick={handleBeginExploration}
                className="mt-5 rounded-md border border-violet-500/60 bg-violet-950/40 px-4 py-2 text-sm text-violet-100"
              >
                Step Forward
              </button>
            </div>
          </div>
        ) : null}

        {showActionLayer ? (
          <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-28">
            <div className="w-full max-w-2xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-4 shadow-xl backdrop-blur-sm">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-violet-200">
                Explore the room
              </h3>
              <p className="mt-2 text-center text-sm text-zinc-300">
                {narrationLog[0] ?? "The house waits."}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => handleExplorationAction("search")}
                  className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-center text-sm font-medium text-violet-100 hover:bg-zinc-800"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => handleExplorationAction("inspect")}
                  className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-center text-sm font-medium text-violet-100 hover:bg-zinc-800"
                >
                  Inspect
                </button>
                <button
                  type="button"
                  onClick={() => handleExplorationAction("listen")}
                  className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-center text-sm font-medium text-violet-100 hover:bg-zinc-800"
                >
                  Listen
                </button>
              </div>
              {currentRoom === "boss_room" && roomPacing.interactionCount >= 2 ? (
                <button
                  type="button"
                  onClick={handleOpenBossBindingChoices}
                  className="mt-3 w-full rounded-lg border border-amber-700/55 bg-amber-950/35 px-3 py-3 text-center text-sm font-medium text-amber-100 hover:bg-amber-950/50"
                >
                  Face the binding
                </button>
              ) : null}
              {canLeaveExploredRoom ? (
                <button
                  type="button"
                  onClick={handleLeaveExploredRoom}
                  className="mt-3 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2.5 text-center text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Leave this area
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {showOutcomeLayer && outcomeOverlay ? (
          <div className="absolute inset-0 z-[45] flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-violet-700/60 bg-zinc-950/90 p-6 text-center shadow-xl backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-violet-100">
                {outcomeOverlay.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {outcomeOverlay.message}
              </p>
              <button
                type="button"
                onClick={handleOutcomeContinue}
                className="mt-5 rounded-md border border-violet-500/60 bg-violet-950/40 px-4 py-2 text-sm text-violet-100"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {showChoiceLayer ? (
          <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-28">
            <div className="w-full max-w-2xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-4 shadow-xl backdrop-blur-sm">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-violet-200">
                {choiceMode === "room_select"
                  ? "Choose Next Room"
                  : "A dangerous choice"}
              </h3>
              <p className="mt-2 text-center text-sm text-zinc-300">
                {narrationLog[0] ?? "The house waits for your decision."}
              </p>

              {choiceMode === "room_select" ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {availableRoomOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleRoomSelectChoice(option.id)}
                      className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {bossBindingChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleRoomActionChoice(choice.id)}
                      className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {showResultLayer && resultCard ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-violet-700/60 bg-zinc-950/85 p-6 text-center shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-violet-100">{resultCard.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{resultCard.message}</p>
              <div className="mt-4 flex justify-center gap-2">
                {resultCard.next === "run_complete" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleResultContinue}
                      className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-zinc-100"
                    >
                      Return to Menu
                    </button>
                    <button
                      type="button"
                      onClick={handlePlayAgain}
                      className="rounded-md border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-300"
                    >
                      Play Again
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleResultContinue}
                    className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-zinc-100"
                  >
                    {resultCard.cta}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
