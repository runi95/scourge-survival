import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 10,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 2,
        unitTypeId: CREEP_TYPE.SHADE,
      },
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.GARGOYLE,
      },
    ],
    [],
  ],
};
