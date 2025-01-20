import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FIVE: Wave = {
  portals: [
    [
      {
        delay: 0.25,
        count: 3,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.5,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
    ],
    [
      {
        delay: 0.25,
        count: 3,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.5,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
    ],
  ],
};
