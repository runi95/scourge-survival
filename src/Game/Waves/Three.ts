import { Sound } from "w3ts";
import { Sounds } from "../../Utility/Sounds";
import { CriticalStrike } from "../CreepUpgrades/CriticalStrike";
import { CREEP_TYPE, GameMap } from "../GameMap";
import { VehicleUpgradeSystem } from "../VehicleUpgradeSystem";
import { Wave } from "./Wave";

export const THREE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
      {
        delay: 0.1,
        count: 3,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.1,
        count: 5,
        unitTypeId: CREEP_TYPE.SKELETON_WARRIOR,
      },
    ],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.GIANT_SKELETON_WARRIOR,
        attackImmediately: true,
      },
    ],
  ],
  bonusUpgrades: [new CriticalStrike()],
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem, playerId: number) => {
    vehicleUpgradeSystem.addFreeRerolls(playerId, 2);

    const spawnSkeletonSound = Sound.create(
      Sounds.SKELETON_WHAT,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON",
    );

    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;

    spawnSkeletonSound.start();
    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, `Free rerolls: |cffffcc00+2|r`);

    const playerArea = GameMap.PLAYER_AREAS[playerId];
    PingMinimapEx(
      playerArea.maxX - 640,
      playerArea.minY + 640,
      4,
      255,
      0,
      0,
      true,
    );
  },
};
