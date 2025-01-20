import { Sound } from "w3ts";
import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";
import { Sounds } from "../../Utility/Sounds";

export const EIGHT: Wave = {
  portals: [
    [],
    [
      {
        delay: 0.2,
        count: 1,
        unitTypeId: CREEP_TYPE.FROST_WYRM,
      },
    ],
  ],
  before: () => {
    const spawnDragonSound = Sound.create(
      Sounds.FROST_WYRM_WAR_CRY,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON"
    );
    spawnDragonSound.start();
  },
};
