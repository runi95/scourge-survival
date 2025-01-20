import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FIVE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
    ],
    [],
  ],
};
