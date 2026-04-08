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
    description: "Recover a ledger page before dawn.",
  },
  {
    id: "hook_missing_heir" as const,
    label: "Missing Heir",
    description: "Find the heir who never came out.",
  },
  {
    id: "hook_broken_oath" as const,
    label: "Broken Oath",
    description: "Your family seal appears in the registry.",
  },
] as const;

export type LobbyStoryHookOptionId =
  (typeof LOBBY_STORY_HOOK_OPTIONS)[number]["id"];
