import type { RoomId } from "./rooms";

export type StoryResultNext =
  | "choice"
  | "room_select"
  | "stay"
  | "run_complete"
  | "explore_more";

export type StoryCondition =
  | { type: "has_flag"; key: string }
  | { type: "missing_flag"; key: string };

export type StoryEffect =
  | { type: "damage_player"; amount: number }
  | { type: "heal_player"; amount: number }
  | { type: "add_clue"; clueId: string }
  | {
      type: "start_combat";
      room: RoomId;
      resumeSceneId: string;
    }
  | {
      type: "grant_reward";
      markRoomComplete?: RoomId;
      completionCard: {
        title: string;
        message: string;
        cta: string;
        next: StoryResultNext;
      };
    }
  | {
      type: "branch_if";
      condition: "room_can_exit";
      thenEffects: StoryEffect[];
      elseSceneId: string;
      /** Applied when the branch takes the else path (before navigating to elseSceneId). */
      elseEffects?: StoryEffect[];
    }
  | { type: "set_flag"; key: string }
  | { type: "clear_flag"; key: string }
  /** Observing entity / meta layer; optional onceKey dedupes across the run. */
  | { type: "meta_message"; text: string; onceKey?: string };

export type StoryChoice = {
  id: string;
  label: string;
  /** Used when no combat/reward blocks navigation. */
  nextSceneId: string;
  narrativeLine?: string;
  effects?: StoryEffect[];
  /** All must pass for the choice to appear (AND). */
  conditions?: StoryCondition[];
};

export type StorySceneIntro = {
  id: string;
  type: "intro";
  roomTitle: string;
  text: string;
  nextSceneId: string;
};

export type StorySceneChoice = {
  id: string;
  type: "choice";
  /** Shown as narration hint when entering the hub (optional). */
  text: string;
  choices: StoryChoice[];
};

/** Exploration hub: copy only; interactions use Search / Inspect / Listen at runtime. */
export type StorySceneAction = {
  id: string;
  type: "action";
  text: string;
};

export type StorySceneResult = {
  id: string;
  type: "result";
  title: string;
  text: string;
  cta: string;
  resultNext: StoryResultNext;
};

export type StoryScene =
  | StorySceneIntro
  | StorySceneChoice
  | StorySceneAction
  | StorySceneResult;

export type StoryBundle = {
  initialSceneId: string;
  scenes: Record<string, StoryScene>;
};
