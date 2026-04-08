"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { updatePlayerClassAction } from "@/app/actions/lobby";
import { characterPortraitSrc } from "@/config/characters";
import { CLASS_SELECT_LORE } from "@/config/classSelectProfiles";
import { initialRpgStatsForClass } from "@/lib/game/classStats";
import { getSupabaseClient } from "@/lib/supabase";
import {
  isValidPlayerClass,
  PLAYER_CLASSES,
  type PlayerClassId,
} from "@/lib/lobby/constants";
import { getStoredPlayerId } from "@/lib/lobby/storage";
import type { Player } from "@/types";

type CharacterSelectLayerProps = {
  players: Player[];
  draftClasses: Record<string, string>;
  setDraftClasses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  allClassesChosen: boolean;
  onConfirm: () => void;
  sessionId: string;
  lobbyCode: string;
};

export function CharacterSelectLayer({
  players,
  draftClasses,
  setDraftClasses,
  allClassesChosen,
  onConfirm,
  sessionId,
  lobbyCode,
}: CharacterSelectLayerProps) {
  const [isPending, startTransition] = useTransition();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hoverClass, setHoverClass] = useState<PlayerClassId | null>(null);
  const [currentClientPlayerId, setCurrentClientPlayerId] = useState<string | null>(
    null,
  );

  const [pickerId, setPickerId] = useState<string | null>(() => players[0]?.id ?? null);

  useEffect(() => {
    setCurrentClientPlayerId(getStoredPlayerId(sessionId));
  }, [sessionId]);

  useEffect(() => {
    const stored = getStoredPlayerId(sessionId);
    if (stored && players.some((p) => p.id === stored)) {
      setPickerId(stored);
    }
  }, [sessionId, players]);

  const lockPickerToSelf = Boolean(
    currentClientPlayerId && players.some((p) => p.id === currentClientPlayerId),
  );

  const effectivePickerId = (() => {
    if (
      lockPickerToSelf &&
      currentClientPlayerId &&
      players.some((p) => p.id === currentClientPlayerId)
    ) {
      return currentClientPlayerId;
    }
    return pickerId ?? players[0]?.id ?? "";
  })();

  const canPickFor = useCallback(
    (playerId: string) => {
      if (!lockPickerToSelf) return true;
      return playerId === currentClientPlayerId;
    },
    [lockPickerToSelf, currentClientPlayerId],
  );

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`game-class-select:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; class: string };
          if (!row?.id) return;
          setDraftClasses((prev) => ({
            ...prev,
            [row.id]: row.class ?? "",
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, setDraftClasses]);

  const persistClass = useCallback(
    (playerId: string, characterClass: PlayerClassId) => {
      setSyncError(null);
      startTransition(async () => {
        const result = await updatePlayerClassAction(
          playerId,
          characterClass,
          lobbyCode,
        );
        if (!result.ok) {
          setSyncError(result.error);
        }
      });
    },
    [lobbyCode],
  );

  const handleChooseClass = (c: PlayerClassId) => {
    const target = effectivePickerId;
    if (!target || !canPickFor(target)) return;
    setDraftClasses((prev) => ({ ...prev, [target]: c }));
    persistClass(target, c);
  };

  const loreClass: PlayerClassId = useMemo(() => {
    if (hoverClass) return hoverClass;
    const picked = draftClasses[effectivePickerId] ?? "";
    if (isValidPlayerClass(picked)) return picked;
    return "Blade";
  }, [hoverClass, draftClasses, effectivePickerId]);

  const loreText = CLASS_SELECT_LORE[loreClass];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/80 px-3 py-8 md:px-6">
      <div className="scene-card flex w-full max-w-6xl flex-col rounded-2xl border border-amber-500/35 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black/95 p-5 shadow-[0_0_80px_rgba(245,158,11,0.12)] backdrop-blur-md md:p-8">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-500/90">
            Character select
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-amber-50 md:text-3xl">
            Choose your party
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {lockPickerToSelf
              ? "Select a class for your hero. Everyone’s pick appears below as they lock in."
              : "Pick a party member, then choose their class. Everyone’s pick appears below."}
          </p>
        </div>

        {/* Party roster — live picks */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {players.map((p) => {
            const choice = draftClasses[p.id] ?? "";
            const valid = isValidPlayerClass(choice);
            const active = p.id === effectivePickerId;
            const portrait = valid ? characterPortraitSrc(choice) : null;
            const isSelf = currentClientPlayerId === p.id;
            const clickable = canPickFor(p.id);

            return (
              <button
                key={p.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setPickerId(p.id)}
                className={`flex min-w-[8.5rem] items-center gap-2 rounded-xl border px-3 py-2 text-left transition md:min-w-[10rem] ${
                  active
                    ? "border-amber-400/70 bg-amber-950/35 ring-1 ring-amber-500/30"
                    : "border-zinc-700/80 bg-zinc-900/60 hover:border-zinc-600"
                } ${!clickable ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-700/80 bg-black/50">
                  {portrait ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={portrait} alt="" className="h-full w-full object-contain object-bottom" />
                  ) : (
                    <span className="text-[10px] font-medium text-zinc-500">?</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-100">
                    {p.name}
                    {isSelf ? (
                      <span className="ml-1 text-[10px] font-normal text-amber-400/90">(you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">
                    {valid ? choice : "Choosing…"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start">
          {/* Class grid — arcade tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {PLAYER_CLASSES.map((c) => {
              const stats = initialRpgStatsForClass(c);
              const mine = (draftClasses[effectivePickerId] ?? "") === c;
              const src = characterPortraitSrc(c);
              return (
                <button
                  key={c}
                  type="button"
                  onMouseEnter={() => setHoverClass(c)}
                  onMouseLeave={() => setHoverClass(null)}
                  onFocus={() => setHoverClass(c)}
                  onBlur={() => setHoverClass(null)}
                  onClick={() => handleChooseClass(c)}
                  disabled={!effectivePickerId || !canPickFor(effectivePickerId)}
                  className={`group relative flex flex-col items-center rounded-2xl border-2 bg-gradient-to-b px-2 pb-4 pt-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 disabled:cursor-not-allowed disabled:opacity-40 ${
                    mine
                      ? "border-amber-400/90 shadow-[0_0_28px_rgba(251,191,36,0.25)]"
                      : "border-zinc-600/70 from-zinc-900/90 to-black/80 hover:border-amber-500/50 hover:shadow-lg"
                  } ${mine ? "from-amber-950/50 to-black/90" : ""}`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="relative flex h-28 w-full items-end justify-center md:h-36">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="max-h-full w-auto object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 font-serif text-lg font-semibold tracking-wide text-amber-50">
                    {c}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-zinc-500">
                    P{stats.power} · S{stats.skill} · M{stats.mind} · G{stats.guard}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Single shared lore panel */}
          <aside className="flex min-h-[12rem] flex-col rounded-2xl border border-zinc-700/70 bg-zinc-950/80 p-4 md:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-500/80">
              {loreClass}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{loreText}</p>
          </aside>
        </div>

        {syncError ? (
          <p className="mt-3 text-center text-xs text-rose-400">{syncError}</p>
        ) : null}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            disabled={!allClassesChosen || isPending}
            onClick={onConfirm}
            className="rounded-lg border border-amber-500/55 bg-amber-600/20 px-10 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.15)] transition hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Enter the house
          </button>
        </div>
      </div>
    </div>
  );
}
