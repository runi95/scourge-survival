import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FIVE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.1,
        count: 2,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
        attackImmediately: true,
      },
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
        attackImmediately: true,
      },
    ],
    [],
  ],
};
