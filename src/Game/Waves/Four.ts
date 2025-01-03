import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const FOUR: Wave = [
  [
    {
      delay: 0.25,
      count: 2,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.5,
      count: 3,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
    {
      delay: 0.5,
      count: 5,
      unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
    },
  ],
  [
    {
      delay: 0.25,
      count: 2,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.5,
      count: 3,
      unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
    },
    {
      delay: 0.5,
      count: 5,
      unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
    },
  ],
];
