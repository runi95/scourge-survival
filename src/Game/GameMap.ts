import { Rectangle } from "w3ts";
import { Vehicle } from "../Vehicles/Vehicle";
import { Creep } from "./Creep";
import { WaveWithUpgrades } from "./Waves/Wave";

export class GameMap {
  public static ONLINE_PLAYER_ID_LIST: number[] = [];
  public static IS_PLAYER_ID_ONLINE: boolean[] = [];
  public static IS_PLAYER_DEFEATED: boolean[] = [];
  public static readonly SELECTED_VEHCILE_MAP: Map<number, Vehicle> = new Map();
  public static readonly PLAYER_COLORS = [
    "ffff0303",
    "ff0042ff",
    "ff1ce6b9",
    "ff540081",
    "fffffc00",
    "fffe8a0e",
    "ff20c000",
    "ffe55bb0",
    "ff959697",
    "ff7ebff1",
    "ff106246",
    "ff4a2a04",
    "ff9b0000",
    "ff0000c3",
    "ff00eaff",
    "ffbe00fe",
    "ffebcd87",
    "fff8a48b",
    "ffbfff80",
    "ffdcb9eb",
    "ff282828",
    "ffebf0ff",
    "ff00781e",
    "ffa46f33",
  ];
  public static PLAYER_AREAS: Rectangle[] = [];
  public playerVehicles: (Vehicle | null)[] = [];
  public static CURRENT_WAVE: number = 0;
  public static readonly REMAINING_PLAYER_CREEPS: Map<number, Creep>[] = [];
  public static readonly REMAINING_PLAYER_CREEPS_COUNT: Map<number, number> =
    new Map();
  public static readonly WAVES: WaveWithUpgrades[] = [];
}

export enum CREEP_TYPE {
  SKELETON_WARRIOR = FourCC("u001"), // Appears wave 1
  GIANT_SKELETON_WARRIOR = FourCC("u00F"), // Appears wave 3
  SKELETAL_MAGE = FourCC("u002"), // Appears wave 4
  MEAT_WAGON = FourCC("u004"), // Appears wave 5
  ANCIENT_SKELETAL_MAGE = FourCC("u00I"), // Appears wave 6
  GHOUL = FourCC("u003"), // Appears wave 7
  CRAZED_GHOUL = FourCC("u00J"), // Appears wave 9
  NECROMANCER = FourCC("u005"), // Appears wave 10
  DEATHLESS_NECROMANCER = FourCC("u00K"), // Appears wave 12
  GARGOYLE = FourCC("u007"), // Appears wave 13
  // SHADE = FourCC("u00E"), // Appears wave 16
  // ABOMINATION = FourCC("u008"), // Appears wave 19
  FROST_WYRM = FourCC("u006"), // Appears wave 15
}
