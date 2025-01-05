import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TEN: Wave = [
  [
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.NECROMANCER,
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
      count: 3,
      unitTypeId: CREEP_TYPE.GHOUL,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.NECROMANCER,
    },
    {
      delay: 0.1,
      count: 3,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
  ],
];
