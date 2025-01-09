import {
  Cannon,
  AttributeBonus,
  Fortification,
  Shockwave,
  AirSupport,
  HardenedSkin,
  TrollRegeneration,
  SlowAura,
} from "./Upgrades/Common/index";
import {
  Glyph,
  MagicSurge,
  WarDrums,
  StormHammers,
  FlakCannons,
} from "./Upgrades/Legendary/index";
import {
  Monsoon,
  CriticalStrike,
  MagicSentry,
  Thorns,
  Impale,
  ScourgeBoneChimes,
} from "./Upgrades/Rare/index";
import {
  ManaLeech,
  GoblinLandMine,
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
  new TrollRegeneration(),
  new SlowAura(),
];

export const uncommonUpgrades: VehicleUpgrade[] = [
  new Evasion(),
  new PermanentImmolation(),
  new GoblinLandMine(),
  new ManaLeech(),
  new EngineeringUpgrade(),
  new InnerFire(),
];

export const rareUpgrades: VehicleUpgrade[] = [
  new Impale(),
  new Monsoon(),
  new CriticalStrike(),
  new MagicSentry(),
  new Thorns(),
  new ScourgeBoneChimes(),
];

export const legendaryUpgrades: VehicleUpgrade[] = [
  new FlakCannons(),
  new Glyph(),
  new MagicSurge(),
  new WarDrums(),
  new StormHammers(),
];

export const vehicleUpgrades: VehicleUpgrade[] = [
  ...commonUpgrades,
  ...uncommonUpgrades,
  ...rareUpgrades,
  ...legendaryUpgrades,
];
