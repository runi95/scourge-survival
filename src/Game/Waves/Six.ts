import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const SIX: Wave = [
  [
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.NECROMANCER,
    },
  ],
  [
    {
      delay: 0.2,
      count: 3,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
  ],
];
