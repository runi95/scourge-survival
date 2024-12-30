import { Rectangle } from "w3ts";
import { Vehicle } from "../Vehicles/Vehicle";

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
}

export enum CREEP_TYPE {
  FEL_BEAST = FourCC("n000"),
  FEL_RAVAGER = FourCC("n001"),
  LESSER_VOIDWALKER = FourCC("n002"),
  VOIDWALKER = FourCC("n003"),
  NECROMANCER = FourCC("u001"),
}
