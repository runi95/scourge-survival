import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const EIGHT: Wave = {
  portals: [
    [
      {
        delay: 0.03,
        count: 20,
        unitTypeId: CREEP_TYPE.GHOUL,
        attackImmediately: true,
      },
      {
        delay: 0.1,
        count: 4,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
        attackImmediately: true,
      },
    ],
    [],
  ],
};
