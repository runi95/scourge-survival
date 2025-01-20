import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const SIX: Wave = {
  portals: [
    [
      {
        delay: 0.3,
        count: 8,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.3,
        count: 3,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
      },
    ],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.ANCIENT_SKELETAL_MAGE,
      },
    ],
  ],
};
