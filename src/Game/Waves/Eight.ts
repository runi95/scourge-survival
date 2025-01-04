import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const EIGHT: Wave = [
  [
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.ABOMINATION,
    },
    {
      delay: 0.1,
      count: 2,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
    {
      delay: 0.3,
      count: 2,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.ABOMINATION,
    },
  ],
  [
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.ABOMINATION,
    },
    {
      delay: 0.1,
      count: 2,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
    {
      delay: 0.3,
      count: 2,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.2,
      count: 1,
      unitTypeId: CREEP_TYPE.ABOMINATION,
    },
  ],
];
