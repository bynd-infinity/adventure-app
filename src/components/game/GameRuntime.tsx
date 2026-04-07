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

const BASE_DAMAGE = 5;
const DAMAGE_VARIANCE = 2;

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function findFirstLivingPlayerIndex(state: GameState): number | null {
  const idx = state.players.findIndex((p) => p.hp > 0);
  return idx === -1 ? null : idx;
}

function findNextLivingPlayerIndex(
  state: GameState,
  fromIndex: number,
): number | null {
  for (let i = fromIndex + 1; i < state.players.length; i++) {
    if (state.players[i]?.hp > 0) return i;
  }
  return null;
}

export function GameRuntime({ initialGameState }: GameRuntimeProps) {
  const [gameState, setGameState] = useState(initialGameState);
  const [narration, setNarration] = useState(
    "Cold air drifts through the hall. Something stirs in the shadows.",
  );

  const activePlayerIndex = gameState.players[gameState.turnIndex]?.hp > 0
    ? gameState.turnIndex
    : findFirstLivingPlayerIndex(gameState);
  const activePlayer =
    activePlayerIndex === null ? null : gameState.players[activePlayerIndex];

  function resolveEnemyTurn(stateAfterPlayers: GameState): {
    nextState: GameState;
    enemyNarration: string;
  } {
    const enemy = stateAfterPlayers.enemies[0];
    if (!enemy) {
      return {
        nextState: { ...stateAfterPlayers, phase: "player" },
        enemyNarration: "Silence. No enemies remain.",
      };
    }

    const targetIndex = findFirstLivingPlayerIndex(stateAfterPlayers);
    if (targetIndex === null) {
      return {
        nextState: { ...stateAfterPlayers, phase: "player" },
        enemyNarration: `${enemy.name} lingers in the dark. No one is left standing.`,
      };
    }

    const target = stateAfterPlayers.players[targetIndex]!;
    const roll = rollDie(20);

    let damage = 0;
    if (roll >= 19) {
      damage = BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + 2;
    } else if (roll >= 13) {
      damage = BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE;
    } else if (roll >= 6) {
      damage =
        BASE_DAMAGE - 1 + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE;
    }
    if (damage < 0) damage = 0;

    const nextHp = Math.max(0, target.hp - damage);
    const nextPlayers = stateAfterPlayers.players.map((p, idx) =>
      idx === targetIndex ? { ...p, hp: nextHp } : p,
    );

    const firstLivingAfterEnemy =
      nextPlayers.findIndex((p) => p.hp > 0) === -1
        ? 0
        : nextPlayers.findIndex((p) => p.hp > 0);

    const outcomeText =
      roll <= 5
        ? "misses"
        : roll >= 19
          ? `lands a brutal strike for ${damage}`
          : `hits for ${damage}`;

    const defeatedText =
      nextHp === 0 ? ` ${target.name} collapses.` : "";

    return {
      nextState: {
        ...stateAfterPlayers,
        players: nextPlayers,
        phase: "player",
        turnIndex: firstLivingAfterEnemy,
      },
      enemyNarration: `${enemy.name} rolls ${roll} and ${outcomeText} ${target.name}.${defeatedText}`,
    };
  }

  function handleAttack() {
    if (!activePlayer || gameState.phase !== "player") return;

    const target = gameState.enemies[0];
    if (!target) {
      setNarration(`${activePlayer.name} lowers their weapon. No foes remain.`);
      return;
    }

    // Rule source: Core-Rule-Set -> "Roll 1d20 + relevant stat".
    // Stats are not modeled yet in MVP data, so the relevant stat bonus is 0.
    const relevantStat = 0;
    const roll = rollDie(20);
    const total = roll + relevantStat;

    let damage = 0;
    let outcome: "miss" | "hit" | "strong" | "critical" = "miss";

    if (total >= 19) {
      outcome = "critical";
      damage = BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + 4;
    } else if (total >= 13) {
      outcome = "strong";
      damage = BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE + 2;
    } else if (total >= 6) {
      outcome = "hit";
      damage = BASE_DAMAGE + rollDie(DAMAGE_VARIANCE * 2 + 1) - DAMAGE_VARIANCE;
    }

    if (damage < 0) damage = 0;

    const nextEnemyHp = target.hp - damage;
    const willDefeatEnemy = nextEnemyHp <= 0;
    const nextPlayerIndex = findNextLivingPlayerIndex(gameState, activePlayerIndex ?? 0);
    const enemyWillAct = nextPlayerIndex === null && !willDefeatEnemy;

    setGameState((prev) => {
      const currentEnemy = prev.enemies[0];
      if (!currentEnemy) return prev;

      const nextHp = Math.max(0, currentEnemy.hp - damage);
      const nextEnemies =
        nextHp <= 0
          ? prev.enemies.slice(1)
          : [{ ...currentEnemy, hp: nextHp }, ...prev.enemies.slice(1)];

      const afterPlayerAttack: GameState = {
        ...prev,
        enemies: nextEnemies,
        turnIndex: nextPlayerIndex ?? prev.turnIndex,
        phase: nextPlayerIndex === null && nextEnemies.length > 0 ? "enemy" : "player",
      };

      if (afterPlayerAttack.phase === "enemy") {
        const enemyTurn = resolveEnemyTurn(afterPlayerAttack);
        setNarration(enemyTurn.enemyNarration);
        return enemyTurn.nextState;
      }

      return afterPlayerAttack;
    });

    if (enemyWillAct) {
      return;
    }

    if (outcome === "miss") {
      setNarration(`${activePlayer.name} rolls ${roll}. Miss.`);
      return;
    }
    if (willDefeatEnemy) {
      setNarration(
        `${activePlayer.name} rolls ${roll}. ${outcome === "critical" ? "Critical hit" : outcome === "strong" ? "Strong hit" : "Hit"} for ${damage}. ${target.name} is defeated.`,
      );
      return;
    }

    if (outcome === "critical") {
      setNarration(`${activePlayer.name} rolls ${roll}. Critical hit for ${damage}.`);
      return;
    }
    if (outcome === "strong") {
      setNarration(`${activePlayer.name} rolls ${roll}. Strong hit for ${damage}.`);
      return;
    }
    setNarration(`${activePlayer.name} rolls ${roll}. Hit for ${damage}.`);
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
        <SceneStage scene={gameState.scene} narration={narration} />
        <ActionBar
          onAttack={handleAttack}
          attackDisabled={
            !activePlayer ||
            gameState.enemies.length === 0 ||
            gameState.phase !== "player"
          }
        />
      </div>
    </div>
  );
}

