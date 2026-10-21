export enum Difficulty {
  EASY = "Easy",
  NORMAL = "Normal",
  HARD = "Hard",
  NIGHTMARE = "Nightmare",
}

// In the order the selection frame lists them (Lua tables have no order)
export const DIFFICULTIES = [
  Difficulty.EASY,
  Difficulty.NORMAL,
  Difficulty.HARD,
  Difficulty.NIGHTMARE,
];

export interface DifficultySetup {
  color: string;
  description: string;
  // Handicaps of the player's scourge: its creeps' life and damage
  life: number;
  damage: number;
}

export const DIFFICULTY_SETUPS: Record<Difficulty, DifficultySetup> = {
  [Difficulty.EASY]: {
    color: "ff20c000",
    description: "Creeps have 75% life and deal 75% damage.",
    life: 0.75,
    damage: 0.75,
  },
  [Difficulty.NORMAL]: {
    color: "ffffcc00",
    description: "The game as it is meant to be played.",
    life: 1,
    damage: 1,
  },
  [Difficulty.HARD]: {
    color: "fffe8a0e",
    description: "Creeps have 130% life and deal 115% damage.",
    life: 1.3,
    damage: 1.15,
  },
  [Difficulty.NIGHTMARE]: {
    color: "ffff0303",
    description: "Creeps have 175% life and deal 135% damage.",
    life: 1.75,
    damage: 1.35,
  },
};

export function parseDifficulty(text: string): Difficulty | undefined {
  const lower = text.toLowerCase();
  for (const difficulty of DIFFICULTIES) {
    if (difficulty.toLowerCase() === lower) return difficulty;
  }
  return undefined;
}
