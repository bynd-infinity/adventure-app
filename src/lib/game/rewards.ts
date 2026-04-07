export type PlayerRewardState = {
  hp: number;
  maxHp: number;
  power: number;
  guard: number;
  mind: number;
  skill: number;
};

export type RewardOption = {
  id: string;
  label: string;
  description: string;
  apply: (player: PlayerRewardState) => PlayerRewardState;
};

function clampToMaxHp(hp: number, maxHp: number): number {
  if (hp < 0) return 0;
  if (hp > maxHp) return maxHp;
  return hp;
}

const REWARD_POOL: RewardOption[] = [
  {
    id: "heal_small",
    label: "Mend Wounds",
    description: "Heal 5 HP.",
    apply: (player) => ({
      ...player,
      hp: clampToMaxHp(player.hp + 5, player.maxHp),
    }),
  },
  {
    id: "hp_up",
    label: "Vitality Sigil",
    description: "Max HP +4 and heal 4.",
    apply: (player) => {
      const maxHp = player.maxHp + 4;
      return {
        ...player,
        maxHp,
        hp: clampToMaxHp(player.hp + 4, maxHp),
      };
    },
  },
  {
    id: "power_up",
    label: "Sharpened Resolve",
    description: "Power +1.",
    apply: (player) => ({ ...player, power: player.power + 1 }),
  },
  {
    id: "guard_up",
    label: "Iron Posture",
    description: "Guard +1.",
    apply: (player) => ({ ...player, guard: player.guard + 1 }),
  },
  {
    id: "mind_up",
    label: "Steady Mind",
    description: "Mind +1.",
    apply: (player) => ({ ...player, mind: player.mind + 1 }),
  },
  {
    id: "skill_up",
    label: "Swift Hands",
    description: "Skill +1.",
    apply: (player) => ({ ...player, skill: player.skill + 1 }),
  },
];

/** Uniform random pick from the full pool (combat / story reward grants). */
export function pickRandomReward(): RewardOption {
  const i = Math.floor(Math.random() * REWARD_POOL.length);
  return REWARD_POOL[i]!;
}

