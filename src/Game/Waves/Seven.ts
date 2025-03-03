import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const SEVEN: Wave = {
  portals: [
    [
      {
        delay: 0.05,
        count: 8,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
        attackImmediately: true,
      },
    ],
    [],
  ],
};
