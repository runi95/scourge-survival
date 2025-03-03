import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TEN: Wave = {
  portals: [
    [
      {
        delay: 0.03,
        count: 8,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 2,
        unitTypeId: CREEP_TYPE.NECROMANCER,
      },
      {
        delay: 0.03,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
    ],
    [],
  ],
};
