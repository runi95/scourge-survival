import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const THREE: Wave = {
  portals: [
    [
      {
        delay: 0.3,
        count: 1,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.3,
        count: 2,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.3,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
    [
      {
        delay: 0.3,
        count: 1,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.3,
        count: 2,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.3,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
  ],
};
