import { Sound } from "../../../node_modules/w3ts/index";
import { Sounds } from "../../Utility/Sounds";
import { CriticalStrike } from "../CreepUpgrades/CriticalStrike";
import { CREEP_TYPE, GameMap } from "../GameMap";
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
  bonusUpgrades: [new CriticalStrike()],
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

    const localPlayerId = GetPlayerId(GetLocalPlayer());
    PingMinimapEx(
      GameMap.PLAYER_AREAS[localPlayerId].maxX - 100,
      GameMap.PLAYER_AREAS[localPlayerId].minY + 100,
      4,
      255,
      0,
      0,
      true
    );
  },
};
