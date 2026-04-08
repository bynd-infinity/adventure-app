/** Story hooks — ids must match `CAMPAIGN_HOOKS` / `GameRuntime` story flags. */
export const LOBBY_STORY_HOOK_OPTIONS = [
  {
    id: "" as const,
    label: "Choose during game",
    description: "Show hook selection after intro.",
  },
  {
    id: "hook_debt_collector" as const,
    label: "Debt Collector",
    description: "A lien followed you; prove what is owed before the house collects.",
  },
  {
    id: "hook_missing_heir" as const,
    label: "Missing Heir",
    description: "Someone worth naming walked in; find what the ledger did with them.",
  },
  {
    id: "hook_broken_oath" as const,
    label: "Broken Oath",
    description: "Your seal is already inked beside names that should not know you.",
  },
] as const;

export type LobbyStoryHookOptionId =
  (typeof LOBBY_STORY_HOOK_OPTIONS)[number]["id"];
