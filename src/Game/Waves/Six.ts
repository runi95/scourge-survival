import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const SIX: Wave = [
  [
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.NECROMANCER,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.MEAT_WAGON,
    },
  ],
  [
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.NECROMANCER,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.MEAT_WAGON,
    },
  ],
];
