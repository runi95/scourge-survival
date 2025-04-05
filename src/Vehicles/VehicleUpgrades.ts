import {
  AttributeBonus,
  Fortification,
  HardenedSkin,
  TrollRegeneration,
  SlowAura,
  BeltOfGiantStrength,
  BootsOfQuelThalas,
  RobeOfTheMagi,
  AdeptTraining,
} from "./Upgrades/Misc/Common/index";
import {
  Cannon,
  Shockwave,
  AirSupport,
  PocketFactory,
} from "./Upgrades/Weapons/Common/index";
import { Glyph, MagicSurge, WarDrums } from "./Upgrades/Misc/Legendary/index";
import { ChainLightning, Tornado } from "./Upgrades/Weapons/Legendary/index";
import {
  CriticalStrike,
  MagicSentry,
  Thorns,
  ScourgeBoneChimes,
} from "./Upgrades/Misc/Rare/index";
import { Impale, OrbOfFire } from "./Upgrades/Weapons/Rare/index";
import {
  ManaLeech,
  Evasion,
  EngineeringUpgrade,
  InnerFire,
  Berserk,
} from "./Upgrades/Misc/Uncommon/index";
import {
  GoblinLandMine,
  PermanentImmolation,
  ClusterRockets,
  LiquidFire,
  WaterElemental,
} from "./Upgrades/Weapons/Uncommon/index";
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
  new PocketFactory(),
  new BeltOfGiantStrength(),
  new BootsOfQuelThalas(),
  new RobeOfTheMagi(),
  new AdeptTraining(),
];

export const uncommonUpgrades: VehicleUpgrade[] = [
  new Evasion(),
  new PermanentImmolation(),
  new GoblinLandMine(),
  new ManaLeech(),
  new EngineeringUpgrade(),
  new InnerFire(),
  new ClusterRockets(),
  new LiquidFire(),
  new Berserk(),
  new WaterElemental(),
];

export const rareUpgrades: VehicleUpgrade[] = [
  new Impale(),
  new CriticalStrike(),
  new MagicSentry(),
  new Thorns(),
  new ScourgeBoneChimes(),
  new OrbOfFire(),
];

export const legendaryUpgrades: VehicleUpgrade[] = [
  new Glyph(),
  new MagicSurge(),
  new WarDrums(),
  new ChainLightning(),
  new Tornado(),
];

export const vehicleUpgrades: VehicleUpgrade[] = [
  ...commonUpgrades,
  ...uncommonUpgrades,
  ...rareUpgrades,
  ...legendaryUpgrades,
];
