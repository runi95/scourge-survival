import { GameMap } from "./GameMap";

export enum Race {
  HUMAN = "Human",
  ORC = "Orc",
  UNDEAD = "Undead",
  NIGHT_ELF = "Night Elf",
}

export interface RaceSetup {
  heroUnitTypeId: number;
  transportUnitTypeId: number;
  startingWeapon?: { itemTypeId: number; upgradeName: string };
}

export const RACE_SETUPS: Record<Race, RaceSetup> = {
  [Race.HUMAN]: {
    heroUnitTypeId: FourCC("H001"),
    transportUnitTypeId: FourCC("n004"),
    startingWeapon: { itemTypeId: FourCC("I000"), upgradeName: "Cannon" },
  },
  [Race.ORC]: {
    heroUnitTypeId: FourCC("O000"),
    transportUnitTypeId: FourCC("n00J"),
    startingWeapon: { itemTypeId: FourCC("I002"), upgradeName: "Shockwave" },
  },
  [Race.UNDEAD]: {
    heroUnitTypeId: FourCC("U000"),
    transportUnitTypeId: FourCC("n00K"),
  },
  [Race.NIGHT_ELF]: {
    heroUnitTypeId: FourCC("E000"),
    transportUnitTypeId: FourCC("n00L"),
  },
};

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
