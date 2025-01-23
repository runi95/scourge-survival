import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const NINE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 8,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
    ],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.CRAZED_GHOUL,
      },
    ],
  ],
};
