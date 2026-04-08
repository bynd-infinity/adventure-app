/**
 * Per-enemy attack narration (enemy turn). Placeholders: {target}, {damage}.
 * {name} is the enemy display name (same as prefix in the full line).
 */

export type EnemyAttackOutcome = "miss" | "hit" | "strong" | "critical";

type LineTable = Record<EnemyAttackOutcome, string>;

const GENERIC: LineTable = {
  miss: "{name}'s attack slips past {target} without purchase.",
  hit: "{name} lands a solid blow on {target} for {damage}.",
  strong: "{name} drives hard into {target} for {damage}.",
  critical: "{name} lands a crushing strike on {target} for {damage}.",
};

/** Template ids must match `ENEMY_TEMPLATES` / `Enemy.templateId`. */
export const ENEMY_ATTACK_LINES: Record<string, LineTable> = {
  restless_spirit: {
    miss: "Chill claws at empty air; {target} is barely out of reach.",
    hit: "Cold threads through {target} for {damage}.",
    strong: "A shriek funnels into {target} for {damage}.",
    critical: "The spirit unravels across {target}'s nerves for {damage}.",
  },
  cursed_doll: {
    miss: "Porcelain fingers snap shut on nothing near {target}.",
    hit: "The doll drags a jagged edge across {target} for {damage}.",
    strong: "It throws porcelain and spite into {target} for {damage}.",
    critical: "Something inside the doll pops; {target} takes {damage} from the burst.",
  },
  shadow_figure: {
    miss: "Shadow folds where {target} was a breath ago.",
    hit: "A silhouette edge catches {target} for {damage}.",
    strong: "The figure doubles; both lines rake {target} for {damage}.",
    critical: "The outline collapses onto {target}, heavy and wrong, for {damage}.",
  },
  portrait_sentry: {
    miss: "The frame's gaze slides off {target}'s guard.",
    hit: "Paint-thin malice scores {target} for {damage}.",
    strong: "The portrait leans; varnish-crack pressure slams {target} for {damage}.",
    critical: "The gilt frame rings; {target} buckles under the stare for {damage}.",
  },
  service_lurker: {
    miss: "A tray-clatter feint; {target} slips the real bite.",
    hit: "Back-hall muscle catches {target} for {damage}.",
    strong: "It closes from the servant angle, fast and mean, for {damage} to {target}.",
    critical: "Service blades flash once; {target} eats {damage} before the echo fades.",
  },
  possessed_armor: {
    miss: "Steel whistles past {target}: empty gauntlets, bad timing.",
    hit: "The harness jerks; a jointed blow catches {target} for {damage}.",
    strong: "Full plate momentum crushes into {target} for {damage}.",
    critical: "The cuirass slams; {target} takes {damage} through helm and bone-rattle.",
  },
  bound_spirit: {
    miss: "The binding snaps at air; {target} is still outside the clause.",
    hit: "Contract-cold nails {target} for {damage}.",
    strong: "The seal flares; ink-weight slams {target} for {damage}.",
    critical: "The house speaks through the spirit; {target} pays {damage} on the ledger.",
  },
};

function linesForTemplate(templateId: string): LineTable {
  return ENEMY_ATTACK_LINES[templateId] ?? GENERIC;
}

export function formatEnemyAttackLine(
  templateId: string,
  outcome: EnemyAttackOutcome,
  enemyName: string,
  targetName: string,
  damageAfterGuard: number,
): string {
  const raw = linesForTemplate(templateId)[outcome];
  return raw
    .replace(/\{name\}/g, enemyName)
    .replace(/\{target\}/g, targetName)
    .replace(/\{damage\}/g, String(damageAfterGuard));
}
