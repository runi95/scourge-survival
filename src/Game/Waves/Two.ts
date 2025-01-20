import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TWO: Wave = {
  portals: [
    [
      {
        delay: 0.5,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
      {
        delay: 0.5,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.5,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
    [],
  ],
};
