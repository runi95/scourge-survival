import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const THIRTEEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 8,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 2,
        unitTypeId: CREEP_TYPE.ABOMINATION,
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
