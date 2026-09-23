import { CreepUpgrade } from "../CreepUpgrades/CreepUpgrade";
import { CreepWaveUpgrade } from "../CreepUpgrades/CreepWaveUpgrade";
import { CREEP_TYPE } from "../GameMap";
import { VehicleUpgradeSystem } from "../VehicleUpgradeSystem";

export type PortalWave = {
  delay: number;
  count: number;
  unitTypeId: CREEP_TYPE;
  attackImmediately?: boolean;
};

export type Wave = {
  bonusUpgrades?: CreepUpgrade[];
  portals: [PortalWave[], PortalWave[]];
  before?: (vehicleUpgradeSystem: VehicleUpgradeSystem) => void;
};

export type WaveWithUpgrades = {
  wave: Wave;
  upgrades: CreepWaveUpgrade[];
};
