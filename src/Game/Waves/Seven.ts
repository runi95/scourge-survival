import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const SEVEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 4,
        unitTypeId: CREEP_TYPE.NECROMANCER,
      },
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
      },
    ],
    [],
  ],
};
