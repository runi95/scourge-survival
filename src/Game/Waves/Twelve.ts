import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TWELVE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 4,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.ABOMINATION,
      },
      {
        delay: 0.1,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
    ],
    [
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.ABOMINATION,
      },
      {
        delay: 0.1,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
    ],
  ],
};
