import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const THIRTEEN: Wave = {
  portals: [
    [
      {
        delay: 0.05,
        count: 5,
        unitTypeId: CREEP_TYPE.GARGOYLE,
        attackImmediately: true,
      },
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.GHOUL,
        attackImmediately: true,
      },
    ],
    [],
  ],
};
