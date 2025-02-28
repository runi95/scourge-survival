import { CREEP_TYPE } from "../GameMap";

export type PortalWave = {
  delay: number;
  count: number;
  unitTypeId: CREEP_TYPE;
  attackImmediately?: boolean;
};

export type Wave = {
  portals: [PortalWave[], PortalWave[]];
  before?: () => void;
};
