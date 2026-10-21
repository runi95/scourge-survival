import { GameMap } from "./GameMap";

export enum Race {
  HUMAN = "Human",
  ORC = "Orc",
  UNDEAD = "Undead",
  NIGHT_ELF = "Night Elf",
}

export interface HeroSetup {
  name: string;
  icon: string;
  heroUnitTypeId: number;
  startingWeapon?: { itemTypeId: number; upgradeName: string };
}

// A race's heroes are offered in this order, the first one picked by default
export interface RaceSetup {
  transportUnitTypeId: number;
  heroes: HeroSetup[];
}

export const RACE_SETUPS: Record<Race, RaceSetup> = {
  [Race.HUMAN]: {
    transportUnitTypeId: FourCC("n004"),
    heroes: [
      {
        name: "Siege Engine",
        icon: "ReplaceableTextures/CommandButtons/BTNSeigeEngine.blp",
        heroUnitTypeId: FourCC("H001"),
        startingWeapon: { itemTypeId: FourCC("I000"), upgradeName: "Cannon" },
      },
    ],
  },
  [Race.ORC]: {
    transportUnitTypeId: FourCC("n00J"),
    heroes: [
      {
        name: "War Kodo",
        icon: "ReplaceableTextures/CommandButtons/BTNKotoBeast.blp",
        heroUnitTypeId: FourCC("O000"),
        startingWeapon: {
          itemTypeId: FourCC("I002"),
          upgradeName: "Shockwave",
        },
      },
    ],
  },
  [Race.UNDEAD]: {
    transportUnitTypeId: FourCC("n00K"),
    heroes: [
      {
        name: "Banshee",
        icon: "ReplaceableTextures/CommandButtons/BTNBanshee.blp",
        heroUnitTypeId: FourCC("U000"),
      },
    ],
  },
  [Race.NIGHT_ELF]: {
    transportUnitTypeId: FourCC("n00L"),
    heroes: [
      {
        name: "Huntress",
        icon: "ReplaceableTextures/CommandButtons/BTNHuntress.blp",
        heroUnitTypeId: FourCC("E000"),
      },
    ],
  },
};

// The most heroes any race has: the selection frame has this many slots
export const MAX_HEROES = Math.max(
  ...[Race.HUMAN, Race.ORC, Race.UNDEAD, Race.NIGHT_ELF].map(
    (race) => RACE_SETUPS[race].heroes.length,
  ),
);

// Set by `npm start` when config.json has "devRace"
declare const DEV_RACE: string | undefined;

export function parseRace(text: string): Race | undefined {
  const key = text
    .toLowerCase()
    .split(" ")
    .join("")
    .split("-")
    .join("")
    .split("_")
    .join("");
  if (key === "human" || key === "hu") return Race.HUMAN;
  if (key === "orc") return Race.ORC;
  if (key === "undead" || key === "ud") return Race.UNDEAD;
  if (key === "nightelf" || key === "elf" || key === "ne")
    return Race.NIGHT_ELF;
  return undefined;
}

export function getRace(whichPlayer: player): Race {
  const race = GetPlayerRace(whichPlayer);
  if (race === RACE_ORC) return Race.ORC;
  if (race === RACE_UNDEAD) return Race.UNDEAD;
  if (race === RACE_NIGHTELF) return Race.NIGHT_ELF;
  return Race.HUMAN;
}

export function initializePlayerRaces(): void {
  const devRace = DEV_RACE != null ? parseRace(DEV_RACE) : undefined;
  for (let i = 0; i < 9; i++) {
    GameMap.PLAYER_RACES[i] = devRace ?? getRace(Player(i));
  }
}
