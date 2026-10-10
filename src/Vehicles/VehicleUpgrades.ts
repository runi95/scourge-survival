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
  SpiritTower,
  LightJavelin,
  SearingArrow,
  WaterElemental,
} from "./Upgrades/Weapons/Common/index";
import {
  Glyph,
  MagicSurge,
  WarDrums,
  FaerieFire,
} from "./Upgrades/Misc/Legendary/index";
import {
  ChainLightning,
  Tornado,
  Blizzard,
} from "./Upgrades/Weapons/Legendary/index";
import {
  CriticalStrike,
  MagicSentry,
  Thorns,
  ScourgeBoneChimes,
} from "./Upgrades/Misc/Rare/index";
import {
  Impale,
  LongRifle,
  OrbOfFire,
  Cripple,
} from "./Upgrades/Weapons/Rare/index";
import {
  ManaLeech,
  Evasion,
  InnerFire,
  Berserk,
} from "./Upgrades/Misc/Uncommon/index";
import {
  GoblinLandMine,
  PermanentImmolation,
  ClusterRockets,
  Burrow,
  FrostNova,
  ThunderClap,
  StormBolt,
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
  new SpiritTower(),
  new LightJavelin(),
  new SearingArrow(),
  new WaterElemental(),
];

export const uncommonUpgrades: VehicleUpgrade[] = [
  new Evasion(),
  new PermanentImmolation(),
  new GoblinLandMine(),
  new ManaLeech(),
  new InnerFire(),
  new ClusterRockets(),
  new Berserk(),
  new Burrow(),
  new FrostNova(),
  new ThunderClap(),
  new StormBolt(),
];

export const rareUpgrades: VehicleUpgrade[] = [
  new Impale(),
  new CriticalStrike(),
  new MagicSentry(),
  new Thorns(),
  new ScourgeBoneChimes(),
  new OrbOfFire(),
  new LongRifle(),
  new Cripple(),
];

export const legendaryUpgrades: VehicleUpgrade[] = [
  new Glyph(),
  new MagicSurge(),
  new WarDrums(),
  new FaerieFire(),
  new ChainLightning(),
  new Tornado(),
  new Blizzard(),
];

export const vehicleUpgrades: VehicleUpgrade[] = [
  ...commonUpgrades,
  ...uncommonUpgrades,
  ...rareUpgrades,
  ...legendaryUpgrades,
];
