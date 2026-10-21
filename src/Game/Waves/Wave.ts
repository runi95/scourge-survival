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
  // When the wave starts for one player
  before?: (
    vehicleUpgradeSystem: VehicleUpgradeSystem,
    playerId: number,
  ) => void;
};

export type WaveWithUpgrades = {
  wave: Wave;
  upgrades: CreepWaveUpgrade[];
};
