import { Sound } from "../../../node_modules/w3ts/index";
import { Sounds } from "../../Utility/Sounds";
import { StrengthInNumbers } from "../CreepUpgrades/StrengthInNumbers";
import { CREEP_TYPE, GameMap } from "../GameMap";
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
  bonusUpgrades: [new StrengthInNumbers()],
  before: () => {
    const spawnSkeletonSound = Sound.create(
      Sounds.THEYLL_ALL_BE_MINE_IN_THE_END,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON"
    );
    spawnSkeletonSound.start();

    const localPlayerId = GetPlayerId(GetLocalPlayer());
    PingMinimapEx(
      GameMap.PLAYER_AREAS[localPlayerId].maxX - 640,
      GameMap.PLAYER_AREAS[localPlayerId].minY + 640,
      4,
      255,
      0,
      0,
      true
    );
  },
};
