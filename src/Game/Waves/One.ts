import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const ONE: Wave = [
  [
    {
      delay: 1,
      count: 10,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
  ],
  [
    {
      delay: 1,
      count: 10,
      unitTypeId: CREEP_TYPE.FEL_BEAST,
    },
  ],
];
