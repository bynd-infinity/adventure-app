export type OutcomeTier = "fail" | "success" | "strong" | "critical";

export type RollMode = "normal" | "advantage" | "disadvantage";

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/** If both advantage and disadvantage apply, they cancel (D&D-style). */
export function combineRollModes(
  hasAdvantage: boolean,
  hasDisadvantage: boolean,
): RollMode {
  if (hasAdvantage && hasDisadvantage) return "normal";
  if (hasAdvantage) return "advantage";
  if (hasDisadvantage) return "disadvantage";
  return "normal";
}

/**
 * d20 + stat, optionally with advantage (higher d20) or disadvantage (lower d20).
 * `d20` is the die value used for the total; `d20Other` is the other die when adv/dis.
 */
export function rollWithStatAndMode(
  stat: number,
  mode: RollMode,
): { d20: number; d20Other: number | null; total: number } {
  const a = rollD20();
  if (mode === "normal") {
    return { d20: a, d20Other: null, total: a + stat };
  }
  const b = rollD20();
  if (mode === "advantage") {
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    return { d20: high, d20Other: low, total: high + stat };
  }
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  return { d20: low, d20Other: high, total: low + stat };
}

/** @deprecated Prefer rollWithStatAndMode(stat, "normal") — kept for short call sites. */
export function rollWithStat(stat: number): { d20: number; total: number } {
  const r = rollWithStatAndMode(stat, "normal");
  return { d20: r.d20, total: r.total };
}

/** Thresholds on (d20 + stat) total. */
export function outcomeTierFromTotal(total: number): OutcomeTier {
  if (total <= 8) return "fail";
  if (total <= 14) return "success";
  if (total <= 18) return "strong";
  return "critical";
}

/** Short line prepended to exploration outcomes. */
export function explorationTierLead(tier: OutcomeTier): string {
  switch (tier) {
    case "fail":
      return "You fail to find anything.";
    case "success":
      return "You uncover something useful.";
    case "strong":
      return "You discover something hidden.";
    case "critical":
      return "You find something significant.";
  }
}

export function formatStatRollSuffix(d20: number, stat: number, total: number): string {
  return ` (d20 ${d20} + ${stat} = ${total})`;
}

export function formatStatRollSuffixWithMode(
  mode: RollMode,
  d20: number,
  d20Other: number | null,
  stat: number,
  total: number,
): string {
  if (mode === "normal" || d20Other === null) {
    return formatStatRollSuffix(d20, stat, total);
  }
  if (mode === "advantage") {
    return ` (d20 ${d20Other}/${d20} adv + ${stat} = ${total})`;
  }
  return ` (d20 ${d20}/${d20Other} dis + ${stat} = ${total})`;
}

/** One-line prefix for player attack narration by check tier. */
export function combatTierPrefix(tier: OutcomeTier): string {
  switch (tier) {
    case "fail":
      return "Your strike goes wide.";
    case "success":
      return "You connect cleanly.";
    case "strong":
      return "You drive the blow home.";
    case "critical":
      return "You strike with devastating force.";
  }
}
