"use client";

import { useState } from "react";
import type { GameState } from "@/types";
import { ActionBar } from "./ActionBar";
import { EnemyPanel } from "./EnemyPanel";
import { GameTopBar } from "./GameTopBar";
import { PartyPanel } from "./PartyPanel";
import { SceneStage } from "./SceneStage";

type GameRuntimeProps = {
  initialGameState: GameState;
};
type EncounterStatus = "active" | "victory" | "defeat";

const BASE_DAMAGE = 5;
const DAMAGE_VARIANCE = 2;

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
  const [gameState, setGameState] = useState(initialGameState);
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>("active");
  const [narrationLog, setNarrationLog] = useState<string[]>([
    "Cold air drifts through the hall. Something stirs in the shadows.",
  ]);

  function pushNarration(line: string) {
    setNarrationLog((prev) => [line, ...prev].slice(0, 4));
  }

  const activePlayerIndex = gameState.players[gameState.turnIndex]?.hp > 0
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

    const defeatedText =
      nextHp === 0 ? ` ${target.name} collapses.` : "";

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

  function handleAttack() {
    if (!activePlayer || gameState.phase !== "player" || encounterStatus !== "active") {
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
        }
        return enemyTurn.nextState;
      }

      return afterPlayerAttack;
    });

    if (enemyWillAct) {
      return;
    }

    if (outcome === "miss") {
      pushNarration(`${activePlayer.name} misses with a ${roll}.`);
      return;
    }
    if (willDefeatEnemy) {
      setEncounterStatus("victory");
      pushNarration(
        `${activePlayer.name} ${outcome === "critical" ? "critically strikes" : outcome === "strong" ? "lands a strong hit on" : "strikes"} ${target.name} for ${damage}.`,
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

  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-zinc-950 bg-cover bg-center bg-no-repeat bg-[url('/backgrounds/entrance-hall.png')] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-1 flex-col pb-40">
        <GameTopBar scene={gameState.scene} phase={gameState.phase} />
        <PartyPanel
          players={gameState.players}
          activePlayerId={activePlayer?.id ?? null}
        />
        <main className="flex flex-1 items-center justify-center">
          <EnemyPanel enemies={gameState.enemies} />
        </main>
        <SceneStage scene={gameState.scene} narrationLog={narrationLog} />
        <ActionBar
          onAttack={handleAttack}
          attackDisabled={
            !activePlayer ||
            getLivingEnemies(gameState).length === 0 ||
            gameState.phase !== "player" ||
            encounterStatus !== "active"
          }
        />

        {encounterStatus !== "active" ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-violet-700/60 bg-zinc-950/85 p-6 text-center shadow-xl backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-violet-100">
                {encounterStatus === "victory" ? "Victory" : "Defeat"}
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                {encounterStatus === "victory"
                  ? "The Restless Spirit fades from the hall."
                  : "Your party has fallen in the haunted hall."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-zinc-100"
                >
                  {encounterStatus === "victory" ? "Continue (Soon)" : "Retry (Soon)"}
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

