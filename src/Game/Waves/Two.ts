import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TWO: Wave = [
  [
    {
      delay: 1,
      count: 3,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
    {
      delay: 1,
      count: 2,
      unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
    },
    {
      delay: 1,
      count: 3,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
  ],
  [
    {
      delay: 1,
      count: 3,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
    {
      delay: 1,
      count: 2,
      unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
    },
    {
      delay: 1,
      count: 3,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
  ],
];
