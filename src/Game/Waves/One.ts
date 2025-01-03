import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const ONE: Wave = [
  [
    {
      delay: 1,
      count: 10,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
  ],
  [
    {
      delay: 1,
      count: 10,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
  ],
];
