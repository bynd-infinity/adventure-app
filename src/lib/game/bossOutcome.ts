import type { StoryResultNext } from "@/lib/story/types";

/** Campaign hook flags (mutually exclusive in normal play). */
export type CampaignHookId =
  | "hook_debt_collector"
  | "hook_missing_heir"
  | "hook_broken_oath";

export function activeCampaignHookFromFlags(
  flags: Record<string, boolean>,
): CampaignHookId | null {
  if (flags.hook_debt_collector) return "hook_debt_collector";
  if (flags.hook_missing_heir) return "hook_missing_heir";
  if (flags.hook_broken_oath) return "hook_broken_oath";
  return null;
}

/** Deterministic resolution order for boss room completion cards (post-combat / leave). */
export type BossOutcomeTier =
  | "successor"
  | "severed_true_read"
  | "bound_bargain"
  | "default_complete";

export function bossOutcomeTierFromFlags(
  flags: Record<string, boolean>,
): BossOutcomeTier {
  if (flags.ending_successor) return "successor";
  if (
    flags.read_house_sigil &&
    flags.registry_names_staged &&
    flags.twist_party_listed
  ) {
    return "severed_true_read";
  }
  if (flags.boss_seal_path) return "bound_bargain";
  return "default_complete";
}

export type BossOutcomeCard = {
  title: string;
  message: string;
  cta: string;
  next: StoryResultNext;
};

/**
 * Ending card shown when the boss room is cleared (combat win / room completion flow).
 * Priority: successor → true-read severed → seal bargain → default.
 */
export function bossOutcomeCardFromFlags(
  flags: Record<string, boolean>,
): BossOutcomeCard {
  const hook = activeCampaignHookFromFlags(flags);
  const tier = bossOutcomeTierFromFlags(flags);
  if (tier === "successor") {
    return {
      title: "Successor",
      message:
        hook === "hook_broken_oath"
          ? "You take the title bound to your family line. The house accepts you."
          : "You accept the contract and inherit the house.",
      cta: "Return to Menu",
      next: "run_complete",
    };
  }
  if (tier === "severed_true_read") {
    return {
      title: "Severed",
      message:
        "You break the contract at its true name. The house loses its claim.",
      cta: "Return to Menu",
      next: "run_complete",
    };
  }
  if (tier === "bound_bargain") {
    return {
      title: "Bound Bargain",
      message:
        hook === "hook_debt_collector"
          ? "You settle the claim in blood and steel. The house lets you leave."
          : "You survive the final bargain. One clause still follows you.",
      cta: "Return to Menu",
      next: "run_complete",
    };
  }
  return {
    title: "Run Complete",
    message: "The binding is broken. The house finally goes still.",
    cta: "Return to Menu",
    next: "run_complete",
  };
}
