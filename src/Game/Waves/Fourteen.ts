import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FOURTEEN: Wave = {
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
