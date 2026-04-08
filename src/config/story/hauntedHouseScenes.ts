import type { ExplorationActionKind } from "@/lib/game/explorationResolve";

export type SceneDecisionStat = "skill" | "mind" | "guard" | "power";

export type HauntedSceneDecision = {
  id: string;
  label: string;
  action: ExplorationActionKind;
  stat: SceneDecisionStat;
};

export const HAUNTED_ROOM_INTRO = {
  entrance_hall: "The entrance hall is clean in the wrong places. Someone still keeps part of it.",
  registry_gallery: "Portraits line the walls beside a guest ledger still open to tonight.",
  library: "The shelves are ordered, but not by author or date. The room catalogs people.",
  servants_corridor: "The back halls are narrow, labeled, and still in active use.",
  dining_room: "The table is set for guests who never arrived. Nothing here is accidental.",
  boss_room: "The altar was prepared with care. This room expected you.",
} as const;

export const HAUNTED_RUN_INTRO_CARDS = [
  "Rain follows you to the door, then stops at the threshold.",
  "Inside, each room feels arranged, not abandoned.",
  "Stay sharp. This house rewards the careless once, then takes twice.",
] as const;

export const HAUNTED_ROOM_SCENE_PROMPTS = {
  entrance_hall: [
    "The chandelier is moving, but the air is still.",
    "One side of the hall is colder than the rest, as if a wall is hollow.",
    "You keep finding signs of use in a room that should be dead.",
  ],
  registry_gallery: [
    "Portrait eyes follow one person at a time.",
    "The registry ink is fresh on a page that should be old.",
    "One frame is cleaner than the others, as if moved often.",
  ],
  library: [
    "Titles are grouped by symbol, not subject.",
    "Margins on separate books repeat the same hand and the same warning mark.",
    "An aisle goes quiet when you look directly at it.",
  ],
  servants_corridor: [
    "Service bells are disconnected, but one still rings faintly.",
    "Door tags match routes carved into the plaster.",
    "The corridor map includes your party initials.",
  ],
  dining_room: [
    "Every place setting points toward one chair at the head of the table.",
    "Serving doors click once, then go still.",
    "The room reads like a ceremony paused at the final step.",
  ],
  boss_room: [
    "Chains hang at measured intervals around the altar.",
    "The ward circle has one obvious break and one hidden break.",
    "Nothing in this room is decorative. Everything has a purpose.",
  ],
} as const;

export const HAUNTED_ROOM_DECISIONS: Record<
  keyof typeof HAUNTED_ROOM_INTRO,
  HauntedSceneDecision[]
> = {
  entrance_hall: [
    {
      id: "check_archway",
      label: "Work the archway seam by seam",
      action: "search",
      stat: "skill",
    },
    {
      id: "read_markings",
      label: "Line up molding marks and read their pattern",
      action: "inspect",
      stat: "mind",
    },
    {
      id: "listen_stairs",
      label: "Stand under the stairs and track the movement",
      action: "listen",
      stat: "guard",
    },
  ],
  registry_gallery: [
    {
      id: "compare_registry",
      label: "Compare tonight's signatures with older entries",
      action: "inspect",
      stat: "mind",
    },
    {
      id: "check_frames",
      label: "Check behind the second and fifth gilt frames",
      action: "search",
      stat: "skill",
    },
    {
      id: "track_balcony_steps",
      label: "Track movement on the upper balcony",
      action: "listen",
      stat: "guard",
    },
  ],
  library: [
    {
      id: "sweep_shelves",
      label: "Pull false spines and test shelf backs",
      action: "search",
      stat: "skill",
    },
    {
      id: "decode_margins",
      label: "Cross-check marginal symbols against the index",
      action: "inspect",
      stat: "mind",
    },
    {
      id: "track_whisper",
      label: "Pinpoint the whispering aisle without stepping in",
      action: "listen",
      stat: "guard",
    },
  ],
  servants_corridor: [
    {
      id: "trace_service_route",
      label: "Trace marked routes between pantry and stair",
      action: "search",
      stat: "skill",
    },
    {
      id: "decode_route_tags",
      label: "Decode route tags and duty codes on the wall",
      action: "inspect",
      stat: "mind",
    },
    {
      id: "hold_at_bell_junction",
      label: "Hold at the bell junction and wait for the runner",
      action: "listen",
      stat: "guard",
    },
  ],
  dining_room: [
    {
      id: "check_sideboard",
      label: "Search the sideboard and serving gaps",
      action: "search",
      stat: "skill",
    },
    {
      id: "read_place_settings",
      label: "Read the place settings as a social order",
      action: "inspect",
      stat: "mind",
    },
    {
      id: "watch_passages",
      label: "Hold for movement behind the service doors",
      action: "listen",
      stat: "guard",
    },
  ],
  boss_room: [
    {
      id: "check_altar",
      label: "Trace chain anchors and altar cuts",
      action: "search",
      stat: "skill",
    },
    {
      id: "read_wards",
      label: "Read the ward script for the intended failure point",
      action: "inspect",
      stat: "mind",
    },
    {
      id: "listen_binding",
      label: "Listen for strain in the binding ring",
      action: "listen",
      stat: "guard",
    },
  ],
};
