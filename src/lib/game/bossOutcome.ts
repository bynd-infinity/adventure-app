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
    const body =
      hook === "hook_broken_oath"
        ? "You take the title bound to your family line. The guest ledger will read your name first from now on."
        : hook === "hook_debt_collector"
          ? "The lien passes to the one still standing. You accept the contract and inherit the house; every name that owed the old claim now answers to yours."
          : hook === "hook_missing_heir"
            ? "The ring takes a new claimant. You inherit the house—whether the heir is found or not, the estate stops hunting the wrong corridors."
            : "You accept the contract and inherit the house.";
    return {
      title: "Successor",
      message: `${body}\n\nBlackglass remembers. The next guest list is already being copied.`,
      cta: "Return to Menu",
      next: "run_complete",
    };
  }
  if (tier === "severed_true_read") {
    const body =
      hook === "hook_debt_collector"
        ? "You tear forged debt at the true name. The contract frays; signatures you proved false no longer bind anyone here."
        : hook === "hook_missing_heir"
          ? "You sever the contract at the true name. The heir's trail is nobody's leash anymore—the index cannot recycle that story."
          : hook === "hook_broken_oath"
            ? "Your seal and the house's marks collapse into one verdict. You break the contract at its true name; the oath dies with the binding."
            : "You break the contract at its true name. The house loses its claim.";
    return {
      title: "Severed",
      message: `${body}\n\nCounty books will still list Blackglass—but tonight's ledger no longer owns you.`,
      cta: "Return to Menu",
      next: "run_complete",
    };
  }
  if (tier === "bound_bargain") {
    const body =
      hook === "hook_debt_collector"
        ? "You settle the claim in blood and steel. The house lets you leave."
        : hook === "hook_missing_heir"
          ? "You survive the final bargain. The heir's chair stays empty, but the house stops demanding you fill it."
          : hook === "hook_broken_oath"
            ? "You survive the final bargain. Your family's oath is spent; what follows you home is only paper and rumor."
            : "You survive the final bargain. One clause still follows you.";
    return {
      title: "Bound Bargain",
      message: `${body}\n\nThe final bargain is closed. Ink dries slower than blood.`,
      cta: "Return to Menu",
      next: "run_complete",
    };
  }
  const defaultBody =
    hook === "hook_debt_collector"
      ? "The binding is broken. The house finally goes still—your claim file will not be reopened tonight."
      : hook === "hook_missing_heir"
        ? "The binding is broken. The house finally goes still—whoever the heir was, they are not the story anymore."
        : hook === "hook_broken_oath"
          ? "The binding is broken. The house finally goes still—your line's name is scratched from the margin."
          : "The binding is broken. The house finally goes still.";
  return {
    title: "Run Complete",
    message: `${defaultBody}\n\nAnother party will read a new guest list. Blackglass does not stay empty.`,
    cta: "Return to Menu",
    next: "run_complete",
  };
}
