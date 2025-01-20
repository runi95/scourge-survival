import { Sound } from "../../../node_modules/w3ts/index";
import { Sounds } from "../../Utility/Sounds";
import { CREEP_TYPE } from "../GameMap";
import { Wave } from "./Wave";

export const THREE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 10,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.GIANT_SKELETON_WARRIOR,
      },
    ],
  ],
  before: () => {
    const spawnSkeletonSound = Sound.create(
      Sounds.SKELETON_WHAT,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON"
    );
    spawnSkeletonSound.start();
  },
};
