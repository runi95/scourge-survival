import { CREEP_TYPE } from "../GameMap";

export type PortalWave = {
  delay: number;
  count: number;
  unitTypeId: CREEP_TYPE;
};

export type Wave = {
  portals: [PortalWave[], PortalWave[]];
  before?: () => void;
};
