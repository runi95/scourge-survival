import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FIVE: Wave = [
  [
    {
      delay: 0.4,
      count: 10,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
    {
      delay: 0.5,
      count: 5,
      unitTypeId: CREEP_TYPE.VOIDWALKER,
    },
  ],
  [
    {
      delay: 0.4,
      count: 10,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
    {
      delay: 0.5,
      count: 5,
      unitTypeId: CREEP_TYPE.VOIDWALKER,
    },
  ],
];
