import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FOURTEEN: Wave = {
  portals: [
    [
      {
        delay: 0.03,
        count: 5,
        unitTypeId: CREEP_TYPE.GARGOYLE,
      },
      {
        delay: 0.03,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.03,
        count: 5,
        unitTypeId: CREEP_TYPE.GARGOYLE,
      },
      {
        delay: 0.03,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.03,
        count: 5,
        unitTypeId: CREEP_TYPE.GARGOYLE,
      },
    ],
    [],
  ],
};
