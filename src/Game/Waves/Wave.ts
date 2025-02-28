import { CreepUpgrade } from "../CreepUpgrades/CreepUpgrade";
import { CREEP_TYPE } from "../GameMap";

export type PortalWave = {
  delay: number;
  count: number;
  unitTypeId: CREEP_TYPE;
  attackImmediately?: boolean;
};

export type Wave = {
  bonusUpgrades?: CreepUpgrade[];
  portals: [PortalWave[], PortalWave[]];
  before?: () => void;
};
