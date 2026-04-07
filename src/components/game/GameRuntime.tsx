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

export function GameRuntime({ initialGameState }: GameRuntimeProps) {
  const [gameState, setGameState] = useState(initialGameState);
  const [narration, setNarration] = useState(
    "Cold air drifts through the hall. Something stirs in the shadows.",
  );

  const activePlayer =
    gameState.players.length > 0
      ? gameState.players[gameState.turnIndex % gameState.players.length]
      : null;

  function handleAttack() {
    if (!activePlayer) return;

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

    setGameState((prev) => {
      const currentEnemy = prev.enemies[0];
      if (!currentEnemy) return prev;

      const nextHp = currentEnemy.hp - damage;
      const nextEnemies =
        nextHp <= 0
          ? prev.enemies.slice(1)
          : [{ ...currentEnemy, hp: nextHp }, ...prev.enemies.slice(1)];

      const nextTurnIndex =
        prev.turnIndex < prev.players.length - 1 ? prev.turnIndex + 1 : prev.turnIndex;

      return {
        ...prev,
        enemies: nextEnemies,
        turnIndex: nextTurnIndex,
      };
    });

    if (outcome === "miss") {
      setNarration(`${activePlayer.name} rolls ${roll}. Miss.`);
      return;
    }

    const targetHp = target.hp - damage;
    if (targetHp <= 0) {
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
        <GameTopBar scene={gameState.scene} />
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
          attackDisabled={!activePlayer || gameState.enemies.length === 0}
        />
      </div>
    </div>
  );
}

