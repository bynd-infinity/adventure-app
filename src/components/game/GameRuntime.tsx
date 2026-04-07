"use client";

import { useState } from "react";
import type { Enemy, GameState } from "@/types";
import { ActionBar } from "./ActionBar";
import { EnemyPanel } from "./EnemyPanel";
import { GameTopBar } from "./GameTopBar";
import { PartyPanel } from "./PartyPanel";
import { SceneStage } from "./SceneStage";

type GameRuntimeProps = {
  initialGameState: GameState;
};

type EncounterStatus = "active" | "victory" | "defeat";
type SceneStageMode = "intro" | "choice" | "combat" | "result";
type ResultNext = "choice" | "room_select" | "stay";
type ChoiceMode = "room_action" | "room_select";
type RoomId = "entrance_hall" | "library" | "dining_room";

type ResultCard = {
  title: string;
  message: string;
  cta: string;
  next: ResultNext;
};

const BASE_DAMAGE = 5;
const DAMAGE_VARIANCE = 2;

const ROOM_LABELS: Record<RoomId, string> = {
  entrance_hall: "Entrance Hall",
  library: "Library",
  dining_room: "Dining Room",
};

const ROOM_BACKGROUNDS: Record<RoomId, string> = {
  entrance_hall: "/backgrounds/entrance-hall.png",
  library: "/backgrounds/library.png",
  dining_room: "/backgrounds/dining-room.png",
};

const ROOM_INTRO: Record<RoomId, string> = {
  entrance_hall: "A dying chandelier swings overhead as the haunted house exhales.",
  library: "Tall shelves loom in silence while pages whisper in the dark.",
  dining_room: "A long table waits beneath tarnished silver and dust-choked air.",
};

const ROOM_ENEMY: Record<RoomId, Enemy> = {
  entrance_hall: { id: "enemy-1", name: "Restless Spirit", hp: 12 },
  library: { id: "enemy-1", name: "Whispering Archivist", hp: 13 },
  dining_room: { id: "enemy-1", name: "Ravenous Butler", hp: 14 },
};

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function clampHp(hp: number): number {
  return Math.max(0, hp);
}

function getLivingPlayers(state: GameState) {
  return state.players.filter((p) => p.hp > 0);
}

function getLivingEnemies(state: GameState) {
  return state.enemies.filter((e) => e.hp > 0);
}

function getFirstLivingPlayerIndex(state: GameState): number | null {
  const idx = state.players.findIndex((p) => p.hp > 0);
  return idx >= 0 ? idx : null;
}

function getFirstLivingEnemy(state: GameState) {
  return state.enemies.find((e) => e.hp > 0) ?? null;
}

function getNextLivingPlayerIndex(state: GameState, fromIndex: number): number | null {
  for (let i = fromIndex + 1; i < state.players.length; i++) {
    if ((state.players[i]?.hp ?? 0) > 0) return i;
  }
  return null;
}

function resolveAttackDamage(roll: number, critBonus: number, strongBonus: number): {
  damage: number;
  outcome: "miss" | "hit" | "strong" | "critical";
} {
  if (roll >= 19) {
    return {
      outcome: "critical",
      damage:
        BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + critBonus,
    };
  }
  if (roll >= 13) {
    return {
      outcome: "strong",
      damage:
        BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + strongBonus,
    };
  }
  if (roll >= 6) {
    return {
      outcome: "hit",
      damage: BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE,
    };
  }
  return { outcome: "miss", damage: 0 };
}

export function GameRuntime({ initialGameState }: GameRuntimeProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>("active");
  const [sceneStage, setSceneStage] = useState<SceneStageMode>("intro");
  const [choiceMode, setChoiceMode] = useState<ChoiceMode>("room_action");
  const [currentRoom, setCurrentRoom] = useState<RoomId>("entrance_hall");
  const [completedRooms, setCompletedRooms] = useState<RoomId[]>([]);
  const [resultCard, setResultCard] = useState<ResultCard | null>(null);
  const [narrationLog, setNarrationLog] = useState<string[]>([
    ROOM_INTRO.entrance_hall,
  ]);

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
        cta: "Choose Next Room",
        next: "room_select",
      };
    }

    const roomSet = new Set<RoomId>([...completedRooms, room]);
    const bothWingsDone = roomSet.has("library") && roomSet.has("dining_room");

    if (bothWingsDone) {
      return {
        title: "Wings Cleared",
        message: "Both wings are explored. A deeper chamber awaits next.",
        cta: "Continue (Soon)",
        next: "stay",
      };
    }

    return {
      title: `${ROOM_LABELS[room]} Cleared`,
      message: "You can press onward into another haunted wing.",
      cta: "Choose Next Room",
      next: "room_select",
    };
  }

  function enterRoom(room: RoomId) {
    setCurrentRoom(room);
    setChoiceMode("room_action");
    setSceneStage("intro");
    setEncounterStatus("active");
    setResultCard(null);
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
    const enemy = ROOM_ENEMY[room];
    setSceneStage("combat");
    setEncounterStatus("active");
    setGameState((prev) => ({
      ...prev,
      scene: room,
      enemies: [{ ...enemy }],
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

  function resolveEnemyTurn(stateAfterPlayers: GameState): {
    nextState: GameState;
    enemyNarration: string;
  } {
    const enemy = getFirstLivingEnemy(stateAfterPlayers);
    if (!enemy) {
      return {
        nextState: { ...stateAfterPlayers, phase: "player" },
        enemyNarration: "Silence. No enemies remain.",
      };
    }

    const targetIndex = getFirstLivingPlayerIndex(stateAfterPlayers);
    if (targetIndex === null) {
      return {
        nextState: { ...stateAfterPlayers, phase: "player" },
        enemyNarration: `${enemy.name} lingers in the dark. No one is left standing.`,
      };
    }

    const target = stateAfterPlayers.players[targetIndex]!;
    const roll = rollDie(20);
    const { damage, outcome } = resolveAttackDamage(roll, 2, 0);

    const nextHp = clampHp(target.hp - damage);
    const nextPlayers = stateAfterPlayers.players.map((p, idx) =>
      idx === targetIndex ? { ...p, hp: nextHp } : p,
    );

    const firstLivingAfterEnemy = nextPlayers.findIndex((p) => p.hp > 0);

    const outcomeText =
      outcome === "miss"
        ? "misses"
        : outcome === "critical"
          ? `lands a brutal strike for ${damage}`
          : `hits for ${damage}`;

    const defeatedText = nextHp === 0 ? ` ${target.name} collapses.` : "";

    return {
      nextState: {
        ...stateAfterPlayers,
        players: nextPlayers,
        phase: "player",
        turnIndex: firstLivingAfterEnemy === -1 ? 0 : firstLivingAfterEnemy,
      },
      enemyNarration: `${enemy.name} rolls ${roll} and ${outcomeText} ${target.name}.${defeatedText}`,
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
    // Stats are not modeled yet in MVP data, so the relevant stat bonus is 0.
    const relevantStat = 0;
    const roll = rollDie(20);
    const total = roll + relevantStat;
    const { damage, outcome } = resolveAttackDamage(total, 4, 2);

    const nextEnemyHp = target.hp - damage;
    const willDefeatEnemy = nextEnemyHp <= 0;
    const nextPlayerIndex = getNextLivingPlayerIndex(gameState, activePlayerIndex ?? 0);
    const enemyWillAct = nextPlayerIndex === null && !willDefeatEnemy;

    setGameState((prev) => {
      const currentEnemy = getFirstLivingEnemy(prev);
      if (!currentEnemy) return prev;

      const nextHp = clampHp(currentEnemy.hp - damage);
      const nextEnemies =
        nextHp <= 0
          ? prev.enemies.filter((e) => e.id !== currentEnemy.id)
          : prev.enemies.map((e) =>
              e.id === currentEnemy.id ? { ...e, hp: nextHp } : e,
            );

      const afterPlayerAttack: GameState = {
        ...prev,
        enemies: nextEnemies,
        turnIndex: nextPlayerIndex ?? prev.turnIndex,
        phase: nextPlayerIndex === null && nextEnemies.length > 0 ? "enemy" : "player",
      };

      if (afterPlayerAttack.phase === "enemy") {
        const enemyTurn = resolveEnemyTurn(afterPlayerAttack);
        pushNarration(enemyTurn.enemyNarration);
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

    if (willDefeatEnemy) {
      setEncounterStatus("victory");
      markRoomComplete(currentRoom);
      setResultCard(roomCompletionCard(currentRoom));
      setSceneStage("result");
      pushNarration(
        `${activePlayer.name} ${
          outcome === "critical"
            ? "critically strikes"
            : outcome === "strong"
              ? "lands a strong hit on"
              : "strikes"
        } ${target.name} for ${damage}.`,
      );
      return;
    }

    if (outcome === "critical") {
      pushNarration(`${activePlayer.name} lands a critical hit for ${damage}.`);
      return;
    }
    if (outcome === "strong") {
      pushNarration(`${activePlayer.name} lands a strong hit for ${damage}.`);
      return;
    }
    pushNarration(`${activePlayer.name} hits for ${damage}.`);
  }

  function handleBeginExploration() {
    setChoiceMode("room_action");
    setSceneStage("choice");
    pushNarration(`${ROOM_LABELS[currentRoom]}: choose your path.`);
  }

  function handleRoomActionChoice(choiceId: string) {
    if (sceneStage !== "choice" || choiceMode !== "room_action") return;

    if (currentRoom === "entrance_hall") {
      if (choiceId === "staircase") {
        pushNarration("You step toward the staircase. A Restless Spirit emerges.");
        beginRoomCombat("entrance_hall");
        return;
      }
      if (choiceId === "doorway") {
        pushNarration("You search the doorway and find only cold silence.");
        markRoomComplete("entrance_hall");
        setResultCard({
          title: "A Hollow Discovery",
          message: "Nothing stirs here. Another wing calls to you.",
          cta: "Choose Next Room",
          next: "room_select",
        });
        setSceneStage("result");
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
        markRoomComplete("library");
        setResultCard(roomCompletionCard("library"));
        setSceneStage("result");
        return;
      }
      if (choiceId === "nook") {
        pushNarration("A hidden nook opens. A Whispering Archivist surges forward.");
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

    if (choiceId === "table") {
      pushNarration("You disturb the banquet. The Ravenous Butler lunges.");
      beginRoomCombat("dining_room");
      return;
    }
    if (choiceId === "cabinet") {
      pushNarration("The cabinet holds only dust and silence.");
      markRoomComplete("dining_room");
      setResultCard(roomCompletionCard("dining_room"));
      setSceneStage("result");
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

    setResultCard(null);

    if (resultCard.next === "choice") {
      setChoiceMode("room_action");
      setSceneStage("choice");
      return;
    }

    if (resultCard.next === "room_select") {
      setChoiceMode("room_select");
      setSceneStage("choice");
      return;
    }
  }

  const showCombatLayer = sceneStage === "combat";
  const showIntroLayer = sceneStage === "intro";
  const showChoiceLayer = sceneStage === "choice";
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
        : [
            { id: "table", label: "Inspect the banquet table" },
            { id: "cabinet", label: "Check the side cabinet" },
            { id: "bell", label: "Ring the silver bell" },
          ];

  return (
    <div
      className="relative flex min-h-screen flex-1 flex-col bg-zinc-950 bg-cover bg-center bg-no-repeat text-zinc-100"
      style={{ backgroundImage: `url('${ROOM_BACKGROUNDS[currentRoom]}')` }}
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
                  <button
                    type="button"
                    onClick={() => handleRoomSelectChoice("library")}
                    className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                  >
                    Go to Library
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoomSelectChoice("dining_room")}
                    className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800"
                  >
                    Go to Dining Room
                  </button>
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

        {showResultLayer && resultCard ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-violet-700/60 bg-zinc-950/85 p-6 text-center shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-violet-100">{resultCard.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{resultCard.message}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleResultContinue}
                  className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-zinc-100"
                >
                  {resultCard.cta}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-300"
                >
                  Return (Soon)
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
