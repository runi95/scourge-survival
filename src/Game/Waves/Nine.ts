import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const NINE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 15,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
      },
    ],
    [],
  ],
};
