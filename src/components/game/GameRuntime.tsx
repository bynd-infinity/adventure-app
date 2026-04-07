"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Enemy, GameState, Player } from "@/types";
import {
  applyIncomingDamageToEnemy,
  enemyAttackRollModifier,
  generateEncounter,
  pickEnemyTargetPlayerIndex,
} from "@/lib/game/enemies";
import { generateRewardOptions, type RewardOption } from "@/lib/game/rewards";
import { ActionBar } from "./ActionBar";
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
type SceneStageMode = "intro" | "choice" | "combat" | "reward" | "result";
type ResultNext =
  | "choice"
  | "room_select"
  | "stay"
  | "run_complete"
  /** Back to current room action choices (exploration not finished). */
  | "explore_more";
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
};

function initialRoomPacing(): RoomPacingState {
  return {
    interactionCount: 0,
    combatTriggered: false,
    combatResolved: false,
  };
}

function roomExitCriteriaMet(p: RoomPacingState): boolean {
  return p.interactionCount >= 2 && (!p.combatTriggered || p.combatResolved);
}

const EXPLORE_RESULT: ResultCard = {
  title: "A moment passes",
  message: "The room still breathes around you. There is more to uncover.",
  cta: "Continue Exploring",
  next: "explore_more",
};

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
    players: initial.players.map((p) => ({
      ...p,
      maxHp: p.hp,
      power: 1,
      guard: 1,
      mind: 1,
      skill: 1,
    })),
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

function resolveAttackDamage(
  roll: number,
  critBonus: number,
  strongBonus: number,
  baseDamage: number = BASE_DAMAGE,
): {
  damage: number;
  outcome: "miss" | "hit" | "strong" | "critical";
} {
  if (roll >= 19) {
    return {
      outcome: "critical",
      damage:
        baseDamage + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + critBonus,
    };
  }
  if (roll >= 13) {
    return {
      outcome: "strong",
      damage:
        baseDamage + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + strongBonus,
    };
  }
  if (roll >= 6) {
    return {
      outcome: "hit",
      damage: baseDamage + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE,
    };
  }
  return { outcome: "miss", damage: 0 };
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
  const [rewardOptions, setRewardOptions] = useState<RewardOption[]>([]);
  const [rewardTargetPlayerId, setRewardTargetPlayerId] = useState<string | null>(null);
  const [narrationLog, setNarrationLog] = useState<string[]>([
    ROOM_INTRO.entrance_hall,
  ]);
  const [roomPacing, setRoomPacing] = useState<RoomPacingState>(initialRoomPacing);

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

  function startRewardStage(targetPlayerId: string, nextCard: ResultCard) {
    setRewardTargetPlayerId(targetPlayerId);
    setRewardOptions(generateRewardOptions(3));
    setResultCard(nextCard);
    setSceneStage("reward");
  }

  function enterRoom(room: RoomId) {
    setCurrentRoom(room);
    setChoiceMode("room_action");
    setSceneStage("intro");
    setEncounterStatus("active");
    setRoomPacing(initialRoomPacing());
    setResultCard(null);
    setRewardOptions([]);
    setRewardTargetPlayerId(null);
    setGameState((prev) => ({
      ...prev,
      scene: room,
      enemies: [],
      phase: "player",
      turnIndex: getFirstLivingPlayerIndex(prev) ?? 0,
    }));
    pushNarration(ROOM_INTRO[room]);
  }

  function beginRoomCombat(room: RoomId) {
    setRoomPacing((p) => ({ ...p, combatTriggered: true }));
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

  const activePlayerIndex =
    gameState.players[gameState.turnIndex]?.hp > 0
      ? gameState.turnIndex
      : getFirstLivingPlayerIndex(gameState);
  const activePlayer =
    activePlayerIndex === null ? null : gameState.players[activePlayerIndex];

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
      const roll = rollDie(20) + enemyAttackRollModifier(enemy.behavior);
      const { damage, outcome } = resolveAttackDamage(roll, 2, 0, enemy.baseDamage);
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
        `${enemy.name} rolls ${roll} and ${outcomeText} ${target.name}.${defeatedText}`,
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

    // Rule source: Core-Rule-Set -> "Roll 1d20 + relevant stat".
    const roll = rollDie(20);
    const total = roll + activePlayer.power;
    const { damage, outcome } = resolveAttackDamage(total, 4, 2);
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
      pushNarration(`${activePlayer.name} misses with a ${roll}.`);
      return;
    }

    if (encounterCleared) {
      setEncounterStatus("victory");
      const pacingAfterWin: RoomPacingState = {
        ...roomPacing,
        combatResolved: true,
      };
      setRoomPacing(pacingAfterWin);
      const canLeaveRoom = roomExitCriteriaMet(pacingAfterWin);

      if (canLeaveRoom) {
        markRoomComplete(currentRoom);
        startRewardStage(activePlayer.id, roomCompletionCard(currentRoom));
      } else {
        startRewardStage(activePlayer.id, COMBAT_WIN_MID_ROOM);
      }
      pushNarration(
        `${activePlayer.name} ${
          outcome === "critical"
            ? "critically strikes"
            : outcome === "strong"
              ? "lands a strong hit on"
              : "strikes"
        } ${target.name} for ${finalDamage}.`,
      );
      return;
    }

    if (outcome === "critical") {
      pushNarration(`${activePlayer.name} lands a critical hit for ${finalDamage}.`);
      return;
    }
    if (outcome === "strong") {
      pushNarration(`${activePlayer.name} lands a strong hit for ${finalDamage}.`);
      return;
    }
    pushNarration(`${activePlayer.name} hits for ${finalDamage}.`);
  }

  function handleRewardSelect(reward: RewardOption) {
    if (sceneStage !== "reward") return;

    setGameState((prev) => {
      const fallbackIndex = getFirstLivingPlayerIndex(prev) ?? 0;
      const targetIndex = rewardTargetPlayerId
        ? prev.players.findIndex((p) => p.id === rewardTargetPlayerId)
        : fallbackIndex;
      const idx = targetIndex >= 0 ? targetIndex : fallbackIndex;
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
    setRewardOptions([]);
    setRewardTargetPlayerId(null);
    setSceneStage("result");
  }

  function handleBeginExploration() {
    setChoiceMode("room_action");
    setSceneStage("choice");
    pushNarration(`${ROOM_LABELS[currentRoom]}: choose your path.`);
  }

  function handleRoomActionChoice(choiceId: string) {
    if (sceneStage !== "choice" || choiceMode !== "room_action") return;

    const nextInteraction = roomPacing.interactionCount + 1;
    setRoomPacing((p) => ({ ...p, interactionCount: p.interactionCount + 1 }));

    const canExitNow = roomExitCriteriaMet({
      interactionCount: nextInteraction,
      combatTriggered: roomPacing.combatTriggered,
      combatResolved: roomPacing.combatResolved,
    });

    if (currentRoom === "entrance_hall") {
      if (choiceId === "staircase") {
        pushNarration("You step toward the staircase. Something cold manifests ahead.");
        beginRoomCombat("entrance_hall");
        return;
      }
      if (choiceId === "doorway") {
        pushNarration("You search the doorway and find only cold silence.");
        if (canExitNow) {
          markRoomComplete("entrance_hall");
          startRewardStage(activePlayer?.id ?? gameState.players[0]?.id ?? "", {
            title: "A Hollow Discovery",
            message: "Nothing stirs here. Another wing calls to you.",
            cta: "Leave Room",
            next: "room_select",
          });
        } else {
          setResultCard(EXPLORE_RESULT);
          setSceneStage("result");
        }
        return;
      }
      applyRiskPenaltyThenCombat(
        "entrance_hall",
        2,
        "Your call echoes back. The chill bites for 2 HP.",
      );
      return;
    }

    if (currentRoom === "library") {
      if (choiceId === "shelves") {
        pushNarration("Dusty tomes crumble in your hands. The library falls quiet.");
        if (canExitNow) {
          markRoomComplete("library");
          startRewardStage(
            activePlayer?.id ?? gameState.players[0]?.id ?? "",
            roomCompletionCard("library"),
          );
        } else {
          setResultCard(EXPLORE_RESULT);
          setSceneStage("result");
        }
        return;
      }
      if (choiceId === "nook") {
        pushNarration("A hidden nook opens. Shelves tremble as a presence surges forward.");
        beginRoomCombat("library");
        return;
      }
      applyRiskPenaltyThenCombat(
        "library",
        2,
        "A cursed page slashes your mind. You lose 2 HP.",
      );
      return;
    }

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

    if (choiceId === "table") {
      pushNarration("You disturb the banquet. The room erupts into motion.");
      beginRoomCombat("dining_room");
      return;
    }
    if (choiceId === "cabinet") {
      pushNarration("The cabinet holds only dust and silence.");
      if (canExitNow) {
        markRoomComplete("dining_room");
        startRewardStage(
          activePlayer?.id ?? gameState.players[0]?.id ?? "",
          roomCompletionCard("dining_room"),
        );
      } else {
        setResultCard(EXPLORE_RESULT);
        setSceneStage("result");
      }
      return;
    }
    applyRiskPenaltyThenCombat(
      "dining_room",
      2,
      "A silver bell rings and your ears split with pain. You lose 2 HP.",
    );
  }

  function handleRoomSelectChoice(nextRoom: RoomId) {
    if (sceneStage !== "choice" || choiceMode !== "room_select") return;
    enterRoom(nextRoom);
  }

  function handleResultContinue() {
    if (!resultCard) return;
    if (encounterStatus === "defeat") return;

    const next = resultCard.next;
    setResultCard(null);

    if (next === "explore_more" || next === "choice") {
      setChoiceMode("room_action");
      setSceneStage("choice");
      setEncounterStatus("active");
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
    setSceneStage("intro");
    setEncounterStatus("active");
    setCompletedRooms([]);
    setRoomPacing(initialRoomPacing());
    setResultCard(null);
    setRewardOptions([]);
    setRewardTargetPlayerId(null);
    setGameState(initLocalState(initialGameState));
    setNarrationLog([ROOM_INTRO.entrance_hall]);
  }

  const showCombatLayer = sceneStage === "combat";
  const showIntroLayer = sceneStage === "intro";
  const showChoiceLayer = sceneStage === "choice";
  const showRewardLayer = sceneStage === "reward";
  const showResultLayer = sceneStage === "result" && !!resultCard;
  const mutedHud = !showCombatLayer;

  const roomChoices =
    currentRoom === "entrance_hall"
      ? [
          { id: "staircase", label: "Investigate the staircase" },
          { id: "doorway", label: "Search the dark doorway" },
          { id: "callout", label: "Call out into the hall" },
        ]
      : currentRoom === "library"
        ? [
            { id: "shelves", label: "Study the crumbling shelves" },
            { id: "nook", label: "Open the hidden reading nook" },
            { id: "ledger", label: "Read the forbidden ledger" },
          ]
        : currentRoom === "dining_room"
          ? [
              { id: "table", label: "Inspect the banquet table" },
              { id: "cabinet", label: "Check the side cabinet" },
              { id: "bell", label: "Ring the silver bell" },
            ]
          : [
              { id: "seal", label: "Break the binding seal" },
              { id: "script", label: "Read the warding script" },
              { id: "chain", label: "Touch the spirit chain" },
            ];

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

  return (
    <div
      className="relative flex min-h-screen flex-1 flex-col bg-zinc-950 bg-cover bg-center bg-no-repeat text-zinc-100"
      style={{ backgroundImage: backgroundStyle }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
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
            <SceneStage narrationLog={narrationLog} />
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
                {ROOM_LABELS[currentRoom]}
              </h2>
              <p className="mt-3 text-sm text-zinc-300">{ROOM_INTRO[currentRoom]}</p>
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

        {showChoiceLayer ? (
          <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-28">
            <div className="w-full max-w-2xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-4 shadow-xl backdrop-blur-sm">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-violet-200">
                {choiceMode === "room_select" ? "Choose Next Room" : "Choose Your Move"}
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
                  {roomChoices.map((choice) => (
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

        {showRewardLayer ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-3xl rounded-xl border border-emerald-700/60 bg-zinc-950/85 p-5 shadow-xl backdrop-blur-sm">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-emerald-200">
                Choose Your Reward
              </h3>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {rewardOptions.map((reward) => (
                  <button
                    key={reward.id}
                    type="button"
                    onClick={() => handleRewardSelect(reward)}
                    className="rounded-lg border border-emerald-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                  >
                    <div className="font-medium text-emerald-200">{reward.label}</div>
                    <div className="mt-1 text-zinc-300">{reward.description}</div>
                  </button>
                ))}
              </div>
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
