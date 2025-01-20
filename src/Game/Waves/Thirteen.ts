import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const THIRTEEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.SHADE,
      },
    ],
    [
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.SHADE,
      },
    ],
  ],
};
