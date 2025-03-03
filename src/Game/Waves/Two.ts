import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TWO: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 12,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
    [],
  ],
};
