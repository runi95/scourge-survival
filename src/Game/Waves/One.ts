import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const ONE: Wave = {
  portals: [
    [
      {
        delay: 1,
        count: 12,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
    [],
  ],
};
