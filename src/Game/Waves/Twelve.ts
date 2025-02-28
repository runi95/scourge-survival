import { UnholyAuraDamageEvent } from "../../Utility/DamageEngine/DamageEvents/UnholyAuraDamageEvent";
import { Creep } from "../Creep";
import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const TWELVE: Wave = {
  portals: [
    [],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.DEATHLESS_NECROMANCER,
      },
      {
        delay: 0.1,
        count: 4,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
      {
        delay: 0.1,
        count: 7,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.1,
        count: 12,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
  ],
};
