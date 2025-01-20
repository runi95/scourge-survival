import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const ELEVEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 4,
        unitTypeId: CREEP_TYPE.NECROMANCER,
      },
      {
        delay: 0.1,
        count: 6,
        unitTypeId: CREEP_TYPE.GARGOYLE,
      },
    ],
    [],
  ],
};
