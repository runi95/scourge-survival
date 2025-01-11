import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const NINE: Wave = [
  [
    {
      delay: 0.1,
      count: 7,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.1,
      count: 1,
      unitTypeId: CREEP_TYPE.SHADE,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
  ],
  [
    {
      delay: 0.1,
      count: 7,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.1,
      count: 1,
      unitTypeId: CREEP_TYPE.SHADE,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
  ],
];
