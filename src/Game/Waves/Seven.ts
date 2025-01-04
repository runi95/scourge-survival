import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const SEVEN: Wave = [
  [
    {
      delay: 0.1,
      count: 10,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
  ],
  [
    {
      delay: 0.1,
      count: 10,
      unitTypeId: CREEP_TYPE.GARGOYLE,
    },
  ],
];
