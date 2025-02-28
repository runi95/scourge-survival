import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FIFTEEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 10,
        unitTypeId: CREEP_TYPE.SHADE,
      },
    ],
    [],
  ],
};
