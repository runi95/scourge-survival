import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FOUR: Wave = [
  [
    {
      delay: 0.25,
      count: 2,
      unitTypeId: CREEP_TYPE.FEL_RAVAGER,
    },
    {
      delay: 0.5,
      count: 3,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
    {
      delay: 0.5,
      count: 5,
      unitTypeId: CREEP_TYPE.LESSER_VOIDWALKER,
    },
  ],
  [
    {
      delay: 0.25,
      count: 2,
      unitTypeId: CREEP_TYPE.FEL_RAVAGER,
    },
    {
      delay: 0.5,
      count: 3,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
    {
      delay: 0.5,
      count: 5,
      unitTypeId: CREEP_TYPE.LESSER_VOIDWALKER,
    },
  ],
];
