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
import {
  HAUNTED_ROOM_DECISIONS,
  HAUNTED_ROOM_INTRO,
  HAUNTED_ROOM_SCENE_PROMPTS,
  HAUNTED_RUN_INTRO_CARDS,
  type SceneDecisionStat,
} from "@/config/story/hauntedHouseScenes";
import {
  campaignObjectiveFromState,
  unlockedRoomsForRun,
} from "@/config/campaignFlow";
import {
  BASE_DAMAGE,
  DAMAGE_VARIANCE,
  ROOM_TIMING_PROFILE,
  UI_PULSE_MS,
  UI_SHAKE_MS,
} from "@/config/balance";
import {
  activeCampaignHookFromFlags,
  bossOutcomeCardFromFlags,
} from "@/lib/game/bossOutcome";
import {
  CAMPAIGN_ROOM_BACKGROUND,
  CAMPAIGN_ROOM_BACKGROUND_FALLBACK,
} from "@/config/campaignAssets";
import { DevGameTools } from "./DevGameTools";
import { BattleArena } from "./BattleArena";
import type { BattlePlayerPhase } from "@/lib/game/battleAnimation";
import { getStoryScene } from "@/lib/story/engine";
import {
  applyStandaloneMetaEffects,
  processStoryEffects,
  type ProcessedStoryEffects,
} from "@/lib/story/effects";
import { initialRpgStatsForClass } from "@/lib/game/classStats";
import { PLAYER_CLASSES, isValidPlayerClass } from "@/lib/lobby/constants";
import { getStoredPlayerId } from "@/lib/lobby/storage";
import {
  explorationCanExitRoom,
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
import { formatEnemyAttackLine } from "@/lib/game/enemyAttackNarration";
import type { StoryResultNext } from "@/lib/story/types";
import { ActionBar } from "./ActionBar";
import { JournalPanel } from "./JournalPanel";
import { GameTopBar } from "./GameTopBar";
import { PartyPanel } from "./PartyPanel";
import { SceneStage } from "./SceneStage";

type GameRuntimeProps = {
  initialGameState: GameState;
  sessionId: string;
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
  | "hook_select"
  | "prologue"
  | "class_select"
  | "intro"
  | "action"
  | "outcome"
  | "choice"
  | "combat_transition"
  | "combat"
  | "result";
type ResultNext = StoryResultNext;
type ChoiceMode = "room_action" | "room_select";
type RoomId =
  | "entrance_hall"
  | "registry_gallery"
  | "library"
  | "servants_corridor"
  | "dining_room"
  | "boss_room";

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
  /** Entrance: counts Search actions for important clue (letter) recovery. */
  entranceSearchPasses: number;
};

function initialRoomPacing(): RoomPacingState {
  return {
    interactionCount: 0,
    combatTriggered: false,
    combatResolved: false,
    usedSearch: false,
    usedInspect: false,
    usedListen: false,
    entranceSearchPasses: 0,
  };
}

function roomExitCriteriaMet(p: RoomPacingState): boolean {
  return explorationCanExitRoom(p);
}

/** Room clear after combat: boss defeat always finishes the run; other rooms need exploration pacing. */
function canClearRoomAfterCombat(p: RoomPacingState, room: RoomId): boolean {
  if (room === "boss_room") return true;
  return explorationCanExitRoom(p);
}

const COMBAT_WIN_MID_ROOM: ResultCard = {
  title: "Threat Broken",
  message: "The immediate threat is down. The room still holds answers.",
  cta: "Return to Room",
  next: "explore_more",
};

const ROOM_LABELS: Record<RoomId, string> = {
  entrance_hall: "Entrance Hall",
  registry_gallery: "Registry Gallery",
  library: "Library",
  servants_corridor: "Servants' Corridor",
  dining_room: "Dining Room",
  boss_room: "Boss Room",
};

const CAMPAIGN_HOOKS = [
  {
    id: "hook_debt_collector",
    title: "Debt Collector",
    text: "Recover a missing ledger page before dawn and settle the claim.",
  },
  {
    id: "hook_missing_heir",
    title: "Missing Heir",
    text: "Find the heir who entered this house and never came out.",
  },
  {
    id: "hook_broken_oath",
    title: "Broken Oath",
    text: "Your family seal appears in this registry. Confirm why.",
  },
] as const;

type CampaignHookId = (typeof CAMPAIGN_HOOKS)[number]["id"];


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
  if (rewardId === "heal_small") return "Breathing steadies; cuts close.";
  if (rewardId === "hp_up") return "Your stamina settles at a higher mark.";
  if (rewardId === "power_up") return "Your strikes feel heavier.";
  if (rewardId === "guard_up") return "You brace faster under pressure.";
  if (rewardId === "mind_up") return "Patterns resolve quicker.";
  return "Your footing and timing improve.";
}

export function GameRuntime({ initialGameState, sessionId }: GameRuntimeProps) {
  const router = useRouter();
  const [gameState, setGameState] = useState<LocalGameState>(() =>
    initLocalState(initialGameState),
  );
  const [encounterStatus, setEncounterStatus] = useState<EncounterStatus>("active");
  const [sceneStage, setSceneStage] = useState<SceneStageMode>("hook_select");
  const [choiceMode, setChoiceMode] = useState<ChoiceMode>("room_action");
  const [currentRoom, setCurrentRoom] = useState<RoomId>("entrance_hall");
  const [completedRooms, setCompletedRooms] = useState<RoomId[]>([]);
  const [resultCard, setResultCard] = useState<ResultCard | null>(null);
  const [narrationLog, setNarrationLog] = useState<string[]>(() => {
    const intro = getStoryScene(
      hauntedHouseEntrance,
      hauntedHouseEntrance.initialSceneId,
    );
    return [intro?.type === "intro" ? intro.text : HAUNTED_ROOM_INTRO.entrance_hall];
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
  /** Bumps when a new combat encounter starts so entrance animations run once. */
  const [encounterAnimGeneration, setEncounterAnimGeneration] = useState(0);
  const [introCardIndex, setIntroCardIndex] = useState(0);
  const [draftClasses, setDraftClasses] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialGameState.players.map((p) => [p.id, p.class ?? ""])),
  );
  const [roomSceneBeat, setRoomSceneBeat] = useState<Record<RoomId, number>>({
    entrance_hall: 0,
    registry_gallery: 0,
    library: 0,
    servants_corridor: 0,
    dining_room: 0,
    boss_room: 0,
  });
  const [currentClientPlayerId, setCurrentClientPlayerId] = useState<string | null>(null);
  const [partyDecisionNote, setPartyDecisionNote] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    label: string;
    playerId: string;
  } | null>(null);
  const [recentDecisionPlayerId, setRecentDecisionPlayerId] = useState<string | null>(null);
  const [combatResolving, setCombatResolving] = useState(false);
  const [battlePlayerPhase, setBattlePlayerPhase] =
    useState<BattlePlayerPhase>("idle");
  const [combatBeatText, setCombatBeatText] = useState<string | null>(null);
  const [impactEnemyId, setImpactEnemyId] = useState<string | null>(null);
  const [impactEnemyKind, setImpactEnemyKind] = useState<
    "miss" | "hit" | "strong" | "critical" | null
  >(null);
  const [impactPlayerId, setImpactPlayerId] = useState<string | null>(null);
  const [combatTransitionText, setCombatTransitionText] = useState<string | null>(null);
  const [impactPulse, setImpactPulse] = useState<"damage" | "clue" | "reward" | "meta" | null>(
    null,
  );
  const [shakeScreen, setShakeScreen] = useState(false);
  const [runStartMs] = useState(() => Date.now());
  const [decisionCount, setDecisionCount] = useState(0);
  const [combatCount, setCombatCount] = useState(0);
  const combatTransitionTimerRef = useRef<number | null>(null);
  const decisionResolveTimerRef = useRef<number | null>(null);

  const discoveredJournalEntries = useMemo(
    () =>
      HAUNTED_HOUSE_JOURNAL_ENTRIES.filter((e) => storyFlags[e.unlockFlag]).map(
        ({ id, title, text }) => ({ id, title, text }),
      ),
    [storyFlags],
  );

  useEffect(() => {
    setCurrentClientPlayerId(getStoredPlayerId(sessionId));
  }, [sessionId]);

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
    setImpactPulse("meta");
    const t = window.setTimeout(() => setMetaNarration(null), 4200);
    return () => window.clearTimeout(t);
  }, [metaNarration]);

  useEffect(() => {
    if (sceneStage === "combat" || sceneStage === "combat_transition") return;
    setBattlePlayerPhase("idle");
  }, [sceneStage]);

  useEffect(
    () => () => {
      if (combatTransitionTimerRef.current !== null) {
        window.clearTimeout(combatTransitionTimerRef.current);
      }
      if (decisionResolveTimerRef.current !== null) {
        window.clearTimeout(decisionResolveTimerRef.current);
      }
    },
    [],
  );

  function pushNarration(line: string) {
    setNarrationLog((prev) => [line, ...prev].slice(0, 4));
  }

  function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function triggerPulse(kind: "damage" | "clue" | "reward" | "meta") {
    setImpactPulse(kind);
    window.setTimeout(() => setImpactPulse(null), UI_PULSE_MS);
  }

  function triggerShake() {
    setShakeScreen(true);
    window.setTimeout(() => setShakeScreen(false), UI_SHAKE_MS);
  }

  function clearCombatImpact() {
    setImpactEnemyId(null);
    setImpactEnemyKind(null);
    setImpactPlayerId(null);
    setCombatBeatText(null);
  }

  function markRoomComplete(room: RoomId) {
    setCompletedRooms((prev) => (prev.includes(room) ? prev : [...prev, room]));
  }

  function roomCompletionCard(room: RoomId): ResultCard {
    if (room === "entrance_hall") {
      return {
        title: "Entrance Cleared",
        message: "The hall gives you passage. Choose a wing.",
        cta: "Leave Room",
        next: "room_select",
      };
    }

    if (room === "boss_room") {
      return bossOutcomeCardFromFlags(storyFlags);
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
    triggerPulse("reward");
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
    setRoomSceneBeat((prev) => ({ ...prev, [room]: 0 }));
    setStoryCombatResumeSceneId(null);
    if (room === "entrance_hall") {
      setEntranceStorySceneId(hauntedHouseEntrance.initialSceneId);
    }
    setResultCard(null);
    setPendingDecision(null);
    setRecentDecisionPlayerId(null);
    setCombatResolving(false);
    clearCombatImpact();
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
      pushNarration(intro?.type === "intro" ? intro.text : HAUNTED_ROOM_INTRO[room]);
    } else {
      pushNarration(HAUNTED_ROOM_INTRO[room]);
    }

    if (room === "registry_gallery" && !storyFlags.registry_gallery_seen) {
      setStoryFlags((prev) => ({ ...prev, registry_gallery_seen: true }));
      const hook = activeCampaignHookFromFlags(storyFlags);
      const hookLine =
        hook === "hook_debt_collector"
          ? "A line item marked COLLECTOR is waiting at the bottom of the page."
          : hook === "hook_missing_heir"
            ? "The missing heir's initials are written in a different hand."
            : hook === "hook_broken_oath"
              ? "Your family seal appears in the margin beside tonight's date."
              : "The open page looks staged for your arrival.";
      setResultCard({
        title: "Open Ledger",
        message: `The registry is already open to tonight. Ink is still wet on names that should be old. ${hookLine}`,
        cta: "Begin Survey",
        next: "explore_more",
      });
      setSceneStage("result");
      return;
    }

    if (room === "servants_corridor" && !storyFlags.servants_midpoint_seen) {
      setStoryFlags((prev) => ({ ...prev, servants_midpoint_seen: true, twist_party_listed: true }));
      setResultCard({
        title: "Midpoint Shift",
        message:
          "A route board lists your party in order. This was scheduled before you arrived.",
        cta: "Continue",
        next: "explore_more",
      });
      setSceneStage("result");
      return;
    }

    if (room === "boss_room" && !storyFlags.boss_hook_seen) {
      const hook = activeCampaignHookFromFlags(storyFlags);
      const hookLine =
        hook === "hook_debt_collector"
          ? "The altar ledger includes your debt claim with a blank signature line."
          : hook === "hook_missing_heir"
            ? "A chair at the edge of the ring bears the heir's crest and fresh blood."
            : hook === "hook_broken_oath"
              ? "Your family oath text is carved into the ring anchor."
              : "The ring includes marks tied to your party.";
      setStoryFlags((prev) => ({ ...prev, boss_hook_seen: true }));
      setResultCard({
        title: "Final Chamber",
        message: `The room confirms your hook was not chance. ${hookLine}`,
        cta: "Take Position",
        next: "explore_more",
      });
      setSceneStage("result");
      return;
    }
  }

  function beginRoomCombat(
    room: RoomId,
    opts?: { entranceResumeSceneId?: string },
  ) {
    setCombatCount((n) => n + 1);
    setRoomPacing((p) => ({ ...p, combatTriggered: true }));
    if (room === "entrance_hall" && opts?.entranceResumeSceneId) {
      setStoryCombatResumeSceneId(opts.entranceResumeSceneId);
    } else if (room !== "entrance_hall") {
      setStoryCombatResumeSceneId(null);
    }
    setCombatTransitionText("Contact.");
    setSceneStage("combat_transition");
    triggerShake();
    if (combatTransitionTimerRef.current !== null) {
      window.clearTimeout(combatTransitionTimerRef.current);
    }
    combatTransitionTimerRef.current = window.setTimeout(() => {
      const enemies = generateEncounter(room);
      setEncounterAnimGeneration((g) => g + 1);
      setBattlePlayerPhase("idle");
      setSceneStage("combat");
      setEncounterStatus("active");
      setCombatTransitionText(null);
      setGameState((prev) => ({
        ...prev,
        scene: room,
        enemies,
        phase: "player",
        turnIndex: getFirstLivingPlayerIndex(prev) ?? 0,
      }));
    }, ROOM_TIMING_PROFILE[room].combatTransitionMs);
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
      triggerPulse("clue");
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
      triggerPulse("damage");
      triggerShake();
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
            message: "You are dropped before the fight can start.",
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
      triggerPulse("reward");
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
      triggerShake();
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
  const hostPlayer = gameState.players.find((p) => p.isHost) ?? gameState.players[0] ?? null;
  const isHostClient =
    !hostPlayer || !currentClientPlayerId ? true : hostPlayer.id === currentClientPlayerId;

  function handleExplorationAction(
    action: ExplorationActionKind,
    statOverride?: number,
  ) {
    if (sceneStage !== "action" || choiceMode !== "room_action") return;
    if (!activePlayer) return;

    const pacingAfter: RoomPacingState = {
      ...roomPacing,
      interactionCount: roomPacing.interactionCount + 1,
      usedSearch: action === "search" ? true : roomPacing.usedSearch,
      usedInspect: action === "inspect" ? true : roomPacing.usedInspect,
      usedListen: action === "listen" ? true : roomPacing.usedListen,
      entranceSearchPasses:
        currentRoom === "entrance_hall" && action === "search"
          ? roomPacing.entranceSearchPasses + 1
          : roomPacing.entranceSearchPasses,
    };
    setRoomPacing(pacingAfter);

    const stat =
      statOverride ??
      (action === "search"
        ? activePlayer.skill
        : action === "inspect"
          ? activePlayer.mind
          : activePlayer.guard);
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

  function statValueForDecision(player: PlayerGameState, stat: SceneDecisionStat): number {
    return stat === "skill"
      ? player.skill
      : stat === "mind"
        ? player.mind
        : stat === "guard"
          ? player.guard
          : player.power;
  }

  function handleSceneDecision(decisionId: string) {
    if (sceneStage !== "action" || choiceMode !== "room_action") return;
    if (!activePlayer) return;
    if (!isHostClient) return;
    if (pendingDecision) return;

    const decision = HAUNTED_ROOM_DECISIONS[currentRoom].find((d) => d.id === decisionId);
    if (!decision) return;
    setDecisionCount((n) => n + 1);
    setPartyDecisionNote(`${hostPlayer?.name ?? "Host"} chose: ${decision.label}`);
    window.setTimeout(() => setPartyDecisionNote(null), 1200);
    setRoomSceneBeat((prev) => ({ ...prev, [currentRoom]: prev[currentRoom] + 1 }));
    const chooserId = hostPlayer?.id ?? activePlayer.id;
    setPendingDecision({ label: decision.label, playerId: chooserId });
    const delayMs = ROOM_TIMING_PROFILE[currentRoom].decisionLockMs;
    if (decisionResolveTimerRef.current !== null) {
      window.clearTimeout(decisionResolveTimerRef.current);
    }
    decisionResolveTimerRef.current = window.setTimeout(() => {
      const stat = statValueForDecision(activePlayer, decision.stat);
      handleExplorationAction(decision.action, stat);
      setPendingDecision(null);
      setRecentDecisionPlayerId(chooserId);
      window.setTimeout(() => setRecentDecisionPlayerId(null), 1100);
      decisionResolveTimerRef.current = null;
    }, delayMs);
  }

  function handleOutcomeContinue() {
    setOutcomeOverlay(null);
    setSceneStage("action");
  }

  function handleLeaveExploredRoom() {
    if (sceneStage !== "action" || choiceMode !== "room_action") return;
    if (pendingDecision) return;
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
              message: "The hall yields no more. Another room is waiting.",
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

    if (currentRoom === "registry_gallery") {
      markRoomComplete("registry_gallery");
      grantRandomRewardThenShowResult(pid, roomCompletionCard("registry_gallery"));
      return;
    }

    if (currentRoom === "servants_corridor") {
      markRoomComplete("servants_corridor");
      grantRandomRewardThenShowResult(pid, roomCompletionCard("servants_corridor"));
      return;
    }

    if (currentRoom === "dining_room") {
      markRoomComplete("dining_room");
      grantRandomRewardThenShowResult(pid, roomCompletionCard("dining_room"));
    }
  }

  function handleOpenBossBindingChoices() {
    if (currentRoom !== "boss_room" || sceneStage !== "action") return;
    if (pendingDecision) return;
    if (roomPacing.interactionCount < 4) return;
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
        enemyNarrations: ["No hostiles remain."],
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
        enemyNarrations.push(`${enemy.name} has no target.`);
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

      const attackCore = formatEnemyAttackLine(
        enemy.templateId,
        outcome,
        enemy.name,
        target.name,
        reduced,
      );

      const defeatedText = nextHp === 0 ? ` ${target.name} collapses.` : "";

      enemyNarrations.push(
        `${enemy.name} rolls ${rollNote}. ${attackCore}${defeatedText}`,
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
    triggerPulse("damage");
    triggerShake();
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
            message: "You are dropped before the fight can start.",
          cta: "Retry (Soon)",
          next: "stay",
        });
        setSceneStage("result");
        return;
      }
    }

    beginRoomCombat(room);
  }

  async function handleAttack() {
    if (
      !activePlayer ||
      gameState.phase !== "player" ||
      encounterStatus !== "active" ||
      sceneStage !== "combat" ||
      combatResolving
    ) {
      return;
    }

    const target = getFirstLivingEnemy(gameState);
    if (!target) {
      pushNarration(`${activePlayer.name} lowers their weapon. No foes remain.`);
      return;
    }
    setCombatResolving(true);
    setBattlePlayerPhase("windup");
    setCombatBeatText(`${activePlayer.name} commits to the strike...`);
    await waitMs(ROOM_TIMING_PROFILE[currentRoom].combatWindupMs);

    const attackMode = playerAttackRollMode(target);
    const { d20, d20Other, total } = rollWithStatAndMode(
      activePlayer.power,
      attackMode,
    );
    const tier = outcomeTierFromTotal(total);
    const { damage, outcome } = resolvePlayerAttackByTier(tier, activePlayer.power);
    const rawHit = Math.max(0, damage + activePlayer.power - 1);
    const finalDamage = applyIncomingDamageToEnemy(target, rawHit);

    setBattlePlayerPhase("strike");
    setImpactEnemyId(target.id);
    setImpactEnemyKind(outcome);
    setCombatBeatText(
      outcome === "miss"
        ? `${activePlayer.name} misses ${target.name}.`
        : outcome === "critical"
          ? `${activePlayer.name} lands a brutal hit on ${target.name}.`
          : outcome === "strong"
            ? `${activePlayer.name} drives ${target.name} back.`
            : `${activePlayer.name} hits ${target.name}.`,
    );
    if (outcome === "critical" || outcome === "strong") triggerShake();
    await waitMs(ROOM_TIMING_PROFILE[currentRoom].combatImpactMs);
    setBattlePlayerPhase("idle");

    const currentEnemy = getFirstLivingEnemy(gameState);
    if (!currentEnemy) {
      clearCombatImpact();
      setCombatResolving(false);
      return;
    }
    const nextHp = clampHp(currentEnemy.hp - finalDamage);
    const nextEnemies =
      nextHp <= 0
        ? gameState.enemies.filter((e) => e.id !== currentEnemy.id)
        : gameState.enemies.map((e) =>
            e.id === currentEnemy.id ? { ...e, hp: nextHp } : e,
          );
    /** Must use post-hit enemy list: old check `length === 1` never fired when killing the last foe in a multi-enemy fight. */
    const encounterCleared = nextEnemies.length === 0;
    const nextPlayerIndex = getNextLivingPlayerIndex(gameState, activePlayerIndex ?? 0);
    const enemyWillAct = nextPlayerIndex === null && !encounterCleared;
    let stateAfterPlayerAttack: LocalGameState = {
      ...gameState,
      enemies: nextEnemies,
      turnIndex: nextPlayerIndex ?? gameState.turnIndex,
      phase: nextPlayerIndex === null && nextEnemies.length > 0 ? "enemy" : "player",
    };
    setGameState(stateAfterPlayerAttack);

    if (outcome === "miss") {
      pushNarration(
        `${combatTierPrefix("fail")} ${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`,
      );
      clearCombatImpact();
      setBattlePlayerPhase("idle");
      setCombatResolving(false);
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
      const canLeaveRoom = canClearRoomAfterCombat(pacingAfterWin, currentRoom);

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
      clearCombatImpact();
      setBattlePlayerPhase("idle");
      setCombatResolving(false);
      return;
    }

    const playerAttackLine =
      outcome === "critical"
        ? `${combatTierPrefix(tier)} ${activePlayer.name} drives a brutal strike into ${target.name} for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`
        : outcome === "strong"
          ? `${combatTierPrefix(tier)} ${activePlayer.name} hits ${target.name} hard for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`
          : `${combatTierPrefix(tier)} ${activePlayer.name} hits ${target.name} for ${finalDamage}.${formatStatRollSuffixWithMode(attackMode, d20, d20Other, activePlayer.power, total)}`;
    pushNarration(playerAttackLine);
    if (!enemyWillAct) {
      clearCombatImpact();
      setBattlePlayerPhase("idle");
      setCombatResolving(false);
      return;
    }

    setBattlePlayerPhase("enemy");
    setCombatBeatText("Enemy movement!");
    await waitMs(ROOM_TIMING_PROFILE[currentRoom].combatEnemyWindupMs);
    const preEnemyState = stateAfterPlayerAttack;
    const enemyTurn = resolveAllEnemyTurns(preEnemyState);
    stateAfterPlayerAttack = enemyTurn.nextState;
    const primaryEnemyLine = enemyTurn.enemyNarrations[0];
    const damaged =
      stateAfterPlayerAttack.players.find((p, i) => {
        const beforeHp = preEnemyState.players[i]?.hp ?? p.hp;
        return p.hp < beforeHp;
      })?.id ?? null;
    if (damaged) {
      setImpactPlayerId(damaged);
      triggerPulse("damage");
      triggerShake();
    }
    setCombatBeatText(primaryEnemyLine ?? "Enemy turn resolves.");
    setGameState(stateAfterPlayerAttack);
    await waitMs(ROOM_TIMING_PROFILE[currentRoom].combatResolveGapMs);
    setBattlePlayerPhase("idle");
    for (const line of enemyTurn.enemyNarrations) {
      pushNarration(line);
    }
    if (getLivingPlayers(stateAfterPlayerAttack).length === 0) {
      setEncounterStatus("defeat");
      setResultCard({
        title: "Defeat",
        message: "Your party is down.",
        cta: "Retry (Soon)",
        next: "stay",
      });
      setSceneStage("result");
    }
    clearCombatImpact();
    setBattlePlayerPhase("idle");
    setCombatResolving(false);
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
          pushNarration(`${ROOM_LABELS.entrance_hall}: choose your next move.`);
        }
        return;
      }
    }
    pushNarration(`${ROOM_LABELS[currentRoom]}: decide your next move.`);
  }

  function handleRoomActionChoice(choiceId: string) {
    if (sceneStage !== "choice" || choiceMode !== "room_action") return;

    if (currentRoom === "boss_room") {
      const hook = activeCampaignHookFromFlags(storyFlags);
      if (choiceId === "seal") {
        setStoryFlags((prev) => ({ ...prev, boss_seal_path: true }));
        pushNarration(
          hook === "hook_debt_collector"
            ? "You invoke the claim and break the seal. The spirit answers at once."
            : hook === "hook_missing_heir"
              ? "You call the heir's name and break the seal. The spirit answers at once."
              : hook === "hook_broken_oath"
                ? "You reject the family wording and break the seal. The spirit answers at once."
                : "You break the seal. The spirit answers at once.",
        );
        beginRoomCombat("boss_room");
        return;
      }
      if (choiceId === "script") {
        const hasTrueRead =
          storyFlags.read_house_sigil &&
          storyFlags.registry_names_staged &&
          storyFlags.twist_party_listed;
        if (hasTrueRead) {
          setStoryFlags((prev) => ({ ...prev, ending_severed: true }));
          setResultCard({
            title: "Severed",
            message:
              "You read the true sequence and cut the contract from its anchor. The chamber falls quiet.",
            cta: "Return to Menu",
            next: "run_complete",
          });
          setSceneStage("result");
          return;
        }
        pushNarration(
          hook === "hook_broken_oath"
            ? "You find the oath glyph and force a rewrite, but the ward still fails."
            : "The ward script breaks at the same flawed glyph.",
        );
        setResultCard({
          title: "Shattered Wards",
          message:
            hook === "hook_missing_heir"
              ? "The ward fails. The chamber keeps what it took."
              : "The ward fails. There is no more delay.",
          cta: "Continue Exploring",
          next: "explore_more",
        });
        setSceneStage("result");
        return;
      }
      const guardStat = activePlayer?.guard ?? gameState.players[0]?.guard ?? 0;
      const roll = rollWithStatAndMode(guardStat, "normal");
      const tier = outcomeTierFromTotal(roll.total);
      if (tier === "strong" || tier === "critical") {
        setStoryFlags((prev) => ({ ...prev, ending_successor: true }));
        setResultCard({
          title: "Successor",
          message:
            "You take the chain without flinching. The ring loosens and the house marks you as heir.",
          cta: "Return to Menu",
          next: "run_complete",
        });
        setSceneStage("result");
        return;
      }
      applyRiskPenaltyThenCombat("boss_room", 3, "You take the chain and fail to hold it. Cold fire burns you for 3 HP.");
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
    setSceneStage("hook_select");
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
    setEncounterAnimGeneration(0);
    setPendingDecision(null);
    setRecentDecisionPlayerId(null);
    setCombatResolving(false);
    setBattlePlayerPhase("idle");
    clearCombatImpact();
    setIntroCardIndex(0);
    setDraftClasses(
      Object.fromEntries(initialGameState.players.map((p) => [p.id, p.class ?? ""])),
    );
    setRoomSceneBeat({
      entrance_hall: 0,
      registry_gallery: 0,
      library: 0,
      servants_corridor: 0,
      dining_room: 0,
      boss_room: 0,
    });
    setGameState(initLocalState(initialGameState));
    setNarrationLog(() => {
      const intro = getStoryScene(
        hauntedHouseEntrance,
        hauntedHouseEntrance.initialSceneId,
      );
      return [intro?.type === "intro" ? intro.text : HAUNTED_ROOM_INTRO.entrance_hall];
    });
  }

  function handleHookSelect(hookId: (typeof CAMPAIGN_HOOKS)[number]["id"]) {
    setStoryFlags((prev) => ({ ...prev, [hookId]: true }));
    const hook = CAMPAIGN_HOOKS.find((h) => h.id === hookId);
    if (hook) pushNarration(`Hook: ${hook.title}. ${hook.text}`);
    setSceneStage("prologue");
  }

  const showCombatLayer = sceneStage === "combat";
  const showHookLayer = sceneStage === "hook_select";
  const showPrologueLayer = sceneStage === "prologue";
  const showClassSelectLayer = sceneStage === "class_select";
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
    { id: "seal", label: "Break the seal and force contact" },
    { id: "script", label: "Test the ward script for a valid line" },
    { id: "chain", label: "Take the chain in hand" },
  ];

  const canLeaveExploredRoom =
    currentRoom !== "boss_room" && roomExitCriteriaMet(roomPacing);

  const showExplorationPacingHint =
    showActionLayer &&
    currentRoom !== "boss_room" &&
    !roomExitCriteriaMet(roomPacing);

  const availableRoomOptions: { id: RoomId; label: string }[] = unlockedRoomsForRun(
    completedRooms,
  ).map((room) => ({
    id: room,
    label:
      room === "boss_room"
        ? "Enter Boss Room"
        : room === "registry_gallery"
          ? "Go to Registry Gallery"
          : room === "servants_corridor"
            ? "Go to Servants' Corridor"
            : room === "library"
              ? "Go to Library"
              : "Go to Dining Room",
  }));

  const backgroundStyle =
    currentRoom === "boss_room"
      ? "url('/backgrounds/boss-room.png'), url('/backgrounds/entrance-hall.png')"
      : `url('${
          CAMPAIGN_ROOM_BACKGROUND_FALLBACK[currentRoom] ??
          CAMPAIGN_ROOM_BACKGROUND[currentRoom]
        }')`;

  const entranceIntroScene = getStoryScene(
    hauntedHouseEntrance,
    entranceStorySceneId,
  );
  const currentScenePrompt = (() => {
    const beats = HAUNTED_ROOM_SCENE_PROMPTS[currentRoom];
    const idx = Math.min(roomSceneBeat[currentRoom], beats.length - 1);
    return beats[idx] ?? "The house waits for your next choice.";
  })();
  const allClassesChosen = gameState.players.every((p) =>
    isValidPlayerClass(draftClasses[p.id] ?? ""),
  );
  const objectiveLine = campaignObjectiveFromState(
    currentRoom,
    completedRooms,
    storyFlags,
  );
  const runMinutes = Math.max(1, Math.round((Date.now() - runStartMs) / 60000));

  return (
    <div
      className={`crt-screen relative flex min-h-screen flex-1 flex-col bg-zinc-950 bg-cover bg-center bg-no-repeat text-zinc-100 ${
        showCombatLayer ? "combat-shell--battle-focus" : ""
      } ${shakeScreen ? "scene-shake" : ""} ${
        impactPulse ? `impact-pulse-${impactPulse}` : ""
      }`}
      style={{
        backgroundImage: showCombatLayer ? undefined : backgroundStyle,
      }}
      data-story-clues={storyClues.length}
    >
      <div className="crt-scanlines pointer-events-none absolute inset-0 z-[3]" aria-hidden />
      <div className="crt-vignette pointer-events-none absolute inset-0 z-[4]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
      {showCombatLayer ? (
        <div
          className="pointer-events-none absolute inset-0 z-[6] bg-black/45"
          aria-hidden
        />
      ) : null}
      {pendingDecision ? (
        <div className="pointer-events-none absolute inset-0 z-[41] bg-black/35 transition-opacity duration-200" />
      ) : null}
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
      {impactPulse ? (
        <div className="pointer-events-none fixed left-1/2 top-[17%] z-[56] -translate-x-1/2">
          <p className="rounded-md border border-zinc-500/40 bg-zinc-950/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-100 shadow-lg backdrop-blur-sm">
            {impactPulse === "clue"
              ? "Clue Discovered"
              : impactPulse === "reward"
                ? "Reward Granted"
                : impactPulse === "damage"
                  ? "Danger Strikes"
                  : "Presence Interrupts"}
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
        <DevGameTools
          currentRoom={currentRoom}
          roomPacing={roomPacing}
          storyFlags={storyFlags}
          onJumpRoom={(room) => enterRoom(room)}
          onReplaceStoryFlags={(next) => setStoryFlags(next)}
          onMergeStoryFlags={(patch) =>
            setStoryFlags((prev) => ({ ...prev, ...patch }))
          }
        />
      ) : null}
      <div className="relative z-10 flex min-h-screen flex-1 flex-col pb-40">
        <GameTopBar scene={gameState.scene} phase={gameState.phase} />
        {!showCombatLayer ? (
          <PartyPanel
            players={gameState.players}
            activePlayerId={activePlayer?.id ?? null}
            decisionLeadId={showActionLayer ? (hostPlayer?.id ?? null) : null}
            recentDecisionPlayerId={recentDecisionPlayerId}
            damagedPlayerId={impactPlayerId}
          />
        ) : null}

        {showCombatLayer ? (
          <>
            <BattleArena
              roomId={currentRoom}
              roomLabel={ROOM_LABELS[currentRoom]}
              players={gameState.players}
              activePlayerId={activePlayer?.id ?? null}
              enemies={gameState.enemies}
              encounterAnimGeneration={encounterAnimGeneration}
              hitEnemyId={impactEnemyId}
              hitKind={impactEnemyKind}
              battlePlayerPhase={battlePlayerPhase}
              impactPlayerId={impactPlayerId}
            >
              <SceneStage
                narrationLog={narrationLog}
                portraitSrc={null}
                portraitAlt={activePlayer?.name}
                variant="embedded"
              />
            </BattleArena>
            {combatBeatText ? (
              <div className="pointer-events-none absolute left-1/2 top-[18%] z-[43] -translate-x-1/2 px-4">
                <p className="combat-beat rounded-md border border-rose-700/55 bg-zinc-950/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">
                  {combatBeatText}
                </p>
              </div>
            ) : null}
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
              sceneStage !== "combat" ||
              combatResolving
            }
          />
        </div>

        {showHookLayer ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="scene-card w-full max-w-3xl rounded-xl border border-amber-700/55 bg-zinc-950/90 p-6 text-center shadow-xl backdrop-blur-sm transition-all duration-300">
              <h2 className="phosphor-glow text-2xl font-semibold text-amber-100">Choose Your Hook</h2>
              <p className="mt-2 text-sm text-zinc-300">
                Why did your party enter Blackglass House?
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {CAMPAIGN_HOOKS.map((hook) => (
                  <button
                    key={hook.id}
                    type="button"
                    onClick={() => handleHookSelect(hook.id)}
                    className="rounded-lg border border-amber-700/45 bg-zinc-900/75 px-3 py-3 text-left hover:bg-zinc-800"
                  >
                    <p className="text-sm font-semibold text-amber-100">{hook.title}</p>
                    <p className="mt-1 text-xs text-zinc-300">{hook.text}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {showPrologueLayer ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="scene-card w-full max-w-2xl rounded-xl border border-amber-700/55 bg-zinc-950/86 p-6 text-center shadow-xl backdrop-blur-sm transition-all duration-300">
              <h2 className="phosphor-glow text-2xl font-semibold text-amber-100">The House Opens</h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-200">
                {HAUNTED_RUN_INTRO_CARDS[introCardIndex]}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (introCardIndex < HAUNTED_RUN_INTRO_CARDS.length - 1) {
                    setIntroCardIndex((i) => i + 1);
                    return;
                  }
                  setSceneStage("class_select");
                }}
                className="mt-5 rounded-md border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100"
              >
                {introCardIndex < HAUNTED_RUN_INTRO_CARDS.length - 1 ? "Next Page" : "Choose Classes"}
              </button>
            </div>
          </div>
        ) : null}

        {showClassSelectLayer ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="scene-card w-full max-w-3xl rounded-xl border border-violet-700/60 bg-zinc-950/88 p-6 shadow-xl backdrop-blur-sm transition-all duration-300">
              <h2 className="phosphor-glow text-center text-2xl font-semibold text-violet-100">
                Choose Class Roles
              </h2>
              <p className="mt-2 text-center text-sm text-zinc-300">
                Make your picks before entering the first scene.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {gameState.players.map((player) => {
                  const selected = draftClasses[player.id] ?? "";
                  const selectedStats = initialRpgStatsForClass(selected);
                  return (
                    <div
                      key={player.id}
                      className="rounded-lg border border-zinc-700/70 bg-zinc-900/70 p-3"
                    >
                      <p className="text-sm font-semibold text-zinc-100">{player.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {selected ? `Selected: ${selected}` : "No class selected"}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {PLAYER_CLASSES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              setDraftClasses((prev) => ({ ...prev, [player.id]: c }))
                            }
                            className={`rounded-md border px-2 py-2 text-xs ${
                              selected === c
                                ? "border-violet-400 bg-violet-900/45 text-violet-100"
                                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                            }`}
                          >
                            <div className="text-center">
                              {characterPortraitSrc(c) ? (
                                // eslint-disable-next-line @next/next/no-img-element -- local static portraits
                                <img
                                  src={characterPortraitSrc(c)!}
                                  alt=""
                                  className="mx-auto mb-1 h-14 w-14 object-contain object-bottom"
                                />
                              ) : null}
                              <p className="font-semibold">{c}</p>
                              <p className="mt-1 text-[10px] text-zinc-400">
                                P{initialRpgStatsForClass(c).power} S{initialRpgStatsForClass(c).skill} M{initialRpgStatsForClass(c).mind} G{initialRpgStatsForClass(c).guard}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {selected ? (
                        <div className="mt-3 rounded border border-violet-700/40 bg-zinc-950/65 px-2 py-1.5 text-[11px] text-violet-100">
                          Stats: Power {selectedStats.power} | Skill {selectedStats.skill} | Mind {selectedStats.mind} | Guard {selectedStats.guard}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  disabled={!allClassesChosen}
                  onClick={() => {
                    setGameState((prev) => ({
                      ...prev,
                      players: prev.players.map((p) => {
                        const c = draftClasses[p.id] ?? "";
                        const stats = initialRpgStatsForClass(c);
                        return {
                          ...p,
                          class: c,
                          power: stats.power,
                          skill: stats.skill,
                          mind: stats.mind,
                          guard: stats.guard,
                        };
                      }),
                    }));
                    setSceneStage("intro");
                  }}
                  className="rounded-md border border-violet-500/60 bg-violet-950/40 px-5 py-2 text-sm text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enter the House
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showIntroLayer ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center px-4">
            <div className="scene-card w-full max-w-xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-6 text-center shadow-xl backdrop-blur-sm">
              <h2 className="phosphor-glow text-2xl font-semibold text-violet-100">
                {currentRoom === "entrance_hall" && entranceIntroScene?.type === "intro"
                  ? entranceIntroScene.roomTitle
                  : ROOM_LABELS[currentRoom]}
              </h2>
              <p className="mt-3 text-sm text-zinc-300">
                {currentRoom === "entrance_hall" && entranceIntroScene?.type === "intro"
                  ? entranceIntroScene.text
                  : HAUNTED_ROOM_INTRO[currentRoom]}
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
        {sceneStage === "combat_transition" ? (
          <div className="absolute inset-0 z-[44] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/55" />
            <div className="scene-card w-full max-w-md rounded-xl border border-rose-700/65 bg-zinc-950/90 p-5 text-center shadow-xl backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-rose-100">Encounter</h3>
              <p className="mt-2 text-sm text-zinc-200">
                {combatTransitionText ?? "Something lunges from the dark."}
              </p>
            </div>
          </div>
        ) : null}

        {showActionLayer ? (
          <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-28">
            <div className="scene-card w-full max-w-2xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-4 shadow-xl backdrop-blur-sm">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-violet-200">
                Party Decision
              </h3>
              <p className="mt-2 text-center text-sm text-zinc-300">
                {currentScenePrompt}
              </p>
              <p className="mt-1 text-center text-xs text-zinc-400">
                {hostPlayer ? `${hostPlayer.name} selects for the party.` : "Make a group call."}
              </p>
              <div className="mt-2 rounded border border-violet-700/35 bg-zinc-900/70 px-2.5 py-2 text-center text-[11px] text-violet-100/95">
                Objective: {objectiveLine}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {HAUNTED_ROOM_DECISIONS[currentRoom].map((decision) => (
                  <button
                    key={decision.id}
                    type="button"
                    onClick={() => handleSceneDecision(decision.id)}
                    disabled={!isHostClient || !!pendingDecision}
                    className={`rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm font-medium text-violet-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55 ${
                      pendingDecision?.label === decision.label ? "decision-pending" : ""
                    }`}
                  >
                    <span className="block">{decision.label}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                      Risk: {decision.risk} | Focus: {decision.focus}
                    </span>
                  </button>
                ))}
              </div>
              {pendingDecision ? (
                <p className="mt-2 text-center text-xs text-zinc-300">
                  {gameState.players.find((p) => p.id === pendingDecision.playerId)?.name ??
                    "Party"}{" "}
                  commits to this move...
                </p>
              ) : null}
              {partyDecisionNote ? (
                <p className="mt-3 text-center text-xs font-medium text-amber-200">{partyDecisionNote}</p>
              ) : null}
              {!isHostClient ? (
                <p className="mt-2 text-center text-[11px] text-zinc-500">
                  Waiting for host choice...
                </p>
              ) : null}
              {currentRoom === "boss_room" && roomPacing.interactionCount >= 4 ? (
                <button
                  type="button"
                  disabled={!isHostClient || !!pendingDecision}
                  onClick={handleOpenBossBindingChoices}
                  className="mt-3 w-full rounded-lg border border-amber-700/55 bg-amber-950/35 px-3 py-3 text-center text-sm font-medium text-amber-100 hover:bg-amber-950/50 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Face the binding
                </button>
              ) : null}
              {showExplorationPacingHint ? (
                <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
                  The space still tests you—use more than one kind of action, and give
                  the room time before you go. Combat here must be finished first.
                </p>
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
            <div className="scene-card outcome-reveal w-full max-w-md rounded-xl border border-violet-700/60 bg-zinc-950/90 p-6 text-center shadow-xl backdrop-blur-sm">
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
            <div className="scene-card w-full max-w-2xl rounded-xl border border-violet-700/60 bg-zinc-950/85 p-4 shadow-xl backdrop-blur-sm">
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
                      disabled={!isHostClient}
                      onClick={() => handleRoomActionChoice(choice.id)}
                      className="rounded-lg border border-violet-600/50 bg-zinc-900/80 px-3 py-3 text-left text-sm text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
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
            <div className="scene-card w-full max-w-md rounded-xl border border-violet-700/60 bg-zinc-950/85 p-6 text-center shadow-xl backdrop-blur-sm">
              <h2 className="phosphor-glow text-2xl font-semibold text-violet-100">{resultCard.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{resultCard.message}</p>
              {process.env.NODE_ENV === "development" ? (
                <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Run {runMinutes}m | decisions {decisionCount} | combats {combatCount}
                </p>
              ) : null}
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
