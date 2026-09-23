import { Sound } from "w3ts";
import { Sounds } from "../../Utility/Sounds";
import { Bash } from "../CreepUpgrades/Bash";
import { CREEP_TYPE, GameMap } from "../GameMap";
import { VehicleUpgradeSystem } from "../VehicleUpgradeSystem";
import { Wave } from "./Wave";

export const NINE: Wave = {
  portals: [
    [
      {
        delay: 1,
        count: 5,
        unitTypeId: CREEP_TYPE.GHOUL,
        attackImmediately: true,
      },
    ],
    [
      {
        delay: 2,
        count: 1,
        unitTypeId: CREEP_TYPE.CRAZED_GHOUL,
      },
      {
        delay: 0.03,
        count: 10,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
    ],
  ],
  bonusUpgrades: [new Bash()],
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem) => {
    for (const playerId of GameMap.ONLINE_PLAYER_ID_LIST) {
      if (GameMap.IS_PLAYER_DEFEATED[playerId]) continue;

      vehicleUpgradeSystem.addFreeRerolls(playerId, 3);
    }

    print("|Cffff0000KEEP MOVING!|r");

    const spawnSkeletonSound = Sound.create(
      Sounds.NO_GUTS_NO_GLORY,
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

    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, `Free rerolls: |cffffcc00+3|r`);

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
