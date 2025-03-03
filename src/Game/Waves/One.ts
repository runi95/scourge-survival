import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const ONE: Wave = {
  portals: [
    [
      {
        delay: 1,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
        attackImmediately: true,
      },
    ],
    [],
  ],
};
