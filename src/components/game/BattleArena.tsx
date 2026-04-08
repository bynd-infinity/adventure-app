"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoomId } from "@/lib/story/rooms";
import type { Enemy } from "@/types";
import type { BattlePlayerPhase } from "@/lib/game/battleAnimation";
import {
  battleViewBackdropForRoom,
  explorationBackdropForRoom,
} from "@/config/campaignAssets";
import { characterPortraitSrc, characterStrikeSrc } from "@/config/characters";
import { EnemyPanel } from "./EnemyPanel";

type BattlePlayer = {
  id: string;
  name: string;
  class: string;
  hp: number;
  maxHp: number;
  isHost?: boolean;
};

type BattleArenaProps = {
  roomId: RoomId;
  roomLabel: string;
  players: BattlePlayer[];
  activePlayerId: string | null;
  enemies: Enemy[];
  encounterAnimGeneration: number;
  hitEnemyId: string | null;
  hitKind: "miss" | "hit" | "strong" | "critical" | null;
  battlePlayerPhase: BattlePlayerPhase;
  impactPlayerId: string | null;
  children: React.ReactNode;
};

function heroPoseClass(
  playerId: string,
  activePlayerId: string | null,
  battlePlayerPhase: BattlePlayerPhase,
  impactPlayerId: string | null,
): string {
  const active = activePlayerId === playerId;
  if (!active) return "battle-arena-hero--ally";
  if (impactPlayerId === playerId) return "battle-arena-hero--hurt";
  switch (battlePlayerPhase) {
    case "windup":
      return "battle-arena-hero--windup";
    case "strike":
      return "battle-arena-hero--strike";
    case "enemy":
      return "battle-arena-hero--brace";
    case "recover":
      return "battle-arena-hero--recover";
    default:
      return "battle-arena-hero--idle";
  }
}

export function BattleArena({
  roomId,
  roomLabel,
  players,
  activePlayerId,
  enemies,
  encounterAnimGeneration,
  hitEnemyId,
  hitKind,
  battlePlayerPhase,
  impactPlayerId,
  children,
}: BattleArenaProps) {
  const intended = useMemo(() => battleViewBackdropForRoom(roomId), [roomId]);
  const [bgSrc, setBgSrc] = useState(intended);

  useEffect(() => {
    setBgSrc(intended);
  }, [intended]);

  const livingPlayers = players.filter((p) => p.hp > 0);

  return (
    <div className="battle-arena relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- room backdrop */}
      <img
        src={bgSrc}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover"
        onError={() => setBgSrc(explorationBackdropForRoom(roomId))}
      />
      <div className="battle-arena-scrim absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-black/20 to-black/80" />
      <div className="battle-arena-floor absolute inset-x-0 bottom-0 z-[2] h-1/3 bg-gradient-to-t from-zinc-950/90 to-transparent" />
      <div
        className="battle-arena-divider pointer-events-none absolute left-1/2 top-[22%] z-[3] hidden h-[38%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-700/25 to-transparent md:block"
        aria-hidden
      />

      <div
        key={encounterAnimGeneration}
        className="battle-arena-stage relative z-10 flex min-h-0 flex-1 flex-col battle-arena--enter"
      >
        <p className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded border border-amber-700/40 bg-zinc-950/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/90 backdrop-blur-sm">
          Battle · {roomLabel}
        </p>

        <div className="flex min-h-0 flex-1 flex-col pt-11">
          <div className="flex min-h-0 shrink-0 flex-col px-2 pt-1 md:px-4">
            <p className="mb-1 w-full text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-rose-300/80">
              Hostiles
            </p>
            <div className="flex min-h-[38%] w-full items-start justify-center">
              <EnemyPanel
                enemies={enemies}
                encounterAnimGeneration={encounterAnimGeneration}
                hitEnemyId={hitEnemyId}
                hitKind={hitKind}
                layout="arena"
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end pb-1">
            <p className="mb-1 w-full px-3 text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-200/75 md:px-6">
              Party
            </p>
            <div className="flex flex-wrap items-end justify-center gap-2 px-3 pb-2 md:gap-3 md:px-6">
              {livingPlayers.map((p) => {
                const portrait = characterPortraitSrc(p.class);
                const strikeArt = characterStrikeSrc(p.class);
                const active = p.id === activePlayerId;
                const pose = heroPoseClass(
                  p.id,
                  activePlayerId,
                  battlePlayerPhase,
                  impactPlayerId,
                );
                const useStrikePng =
                  active &&
                  battlePlayerPhase === "strike" &&
                  strikeArt !== null;
                const imgSrc = useStrikePng ? strikeArt : portrait;

                return (
                  <div
                    key={p.id}
                    className={`battle-arena-hero flex flex-col items-center rounded-lg border bg-zinc-950/65 px-2 pb-2 pt-1 shadow-lg backdrop-blur-sm transition-transform duration-200 ${
                      active
                        ? "border-amber-500/70 ring-2 ring-amber-500/25"
                        : "border-zinc-600/50 opacity-90"
                    } ${pose}`}
                  >
                    <div className="relative h-[5.75rem] w-[5.75rem] overflow-hidden md:h-[6.75rem] md:w-[6.75rem]">
                      {imgSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgSrc}
                          alt=""
                          className="h-full w-full object-contain object-bottom drop-shadow-[0_6px_12px_rgba(0,0,0,0.75)]"
                          onError={(e) => {
                            if (useStrikePng && portrait) {
                              (e.target as HTMLImageElement).src = portrait;
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
                          —
                        </div>
                      )}
                    </div>
                    <p className="mt-1 max-w-[7rem] truncate text-center text-[11px] font-semibold text-zinc-100">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      HP {p.hp}/{p.maxHp}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
