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
        count: 10,
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
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem) => {
    for (const playerId of GameMap.ONLINE_PLAYER_ID_LIST) {
      if (GameMap.IS_PLAYER_DEFEATED[playerId]) continue;

      vehicleUpgradeSystem.addFreeRerolls(playerId, 2);
    }

    const spawnSkeletonSound = Sound.create(
      Sounds.SKELETON_WHAT,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON",
    );
    spawnSkeletonSound.start();

    const localPlayerId = GetPlayerId(GetLocalPlayer());
    if (GameMap.IS_PLAYER_DEFEATED[localPlayerId]) return;

    const localPlayerArea = GameMap.PLAYER_AREAS[localPlayerId];
    if (localPlayerArea == null) return;

    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, `Free rerolls: |cffffcc00+2|r`);

    PingMinimapEx(
      localPlayerArea.maxX - 640,
      localPlayerArea.minY + 640,
      4,
      255,
      0,
      0,
      true,
    );
  },
};
