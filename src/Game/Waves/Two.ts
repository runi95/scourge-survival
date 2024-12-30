import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TWO: Wave = [
  [
    {
      delay: 1,
      count: 2,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
    {
      delay: 1,
      count: 3,
      unitTypeId: CREEP_TYPE.LESSER_VOIDWALKER,
    },
    {
      delay: 1,
      count: 2,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
  ],
  [
    {
      delay: 1,
      count: 2,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
    {
      delay: 1,
      count: 3,
      unitTypeId: CREEP_TYPE.LESSER_VOIDWALKER,
    },
    {
      delay: 1,
      count: 2,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
  ],
];
