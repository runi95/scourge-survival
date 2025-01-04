import {
  Cannon,
  AttributeBonus,
  Fortification,
  Shockwave,
  AirSupport,
  HardenedSkin,
} from "./Upgrades/Common/index";
import {
  Glyph,
  MagicSurge,
  Dummy5,
  Dummy9,
  FlakCannons,
} from "./Upgrades/Legendary/index";
import { Monsoon, Dummy6, Dummy7, Dummy8, Impale } from "./Upgrades/Rare/index";
import {
  ManaLeech,
  GoblinLandMine,
  CriticalStrike,
  Evasion,
  PermanentImmolation,
  EngineeringUpgrade,
  InnerFire,
} from "./Upgrades/Uncommon/index";
import { VehicleUpgrade } from "./VehicleUpgrade";

export const commonUpgrades: VehicleUpgrade[] = [
  new Cannon(),
  new AttributeBonus(),
  new Fortification(),
  new Shockwave(),
  new AirSupport(),
  new HardenedSkin(),
];

export const uncommonUpgrades: VehicleUpgrade[] = [
  new Evasion(),
  new PermanentImmolation(),
  new GoblinLandMine(),
  new ManaLeech(),
  new CriticalStrike(),
  new EngineeringUpgrade(),
  new InnerFire(),
];

export const rareUpgrades: VehicleUpgrade[] = [
  new Impale(),
  new Monsoon(),
  new Dummy6(),
  new Dummy7(),
  new Dummy8(),
];

export const legendaryUpgrades: VehicleUpgrade[] = [
  new FlakCannons(),
  new Glyph(),
  new MagicSurge(),
  new Dummy9(),
  new Dummy5(),
];

export const vehicleUpgrades: VehicleUpgrade[] = [
  ...commonUpgrades,
  ...uncommonUpgrades,
  ...rareUpgrades,
  ...legendaryUpgrades,
];
