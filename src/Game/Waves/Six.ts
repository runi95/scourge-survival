import { Sound } from "w3ts";
import { Sounds } from "../../Utility/Sounds";
import { MagicResistance } from "../CreepUpgrades/MagicResistance";
import { CREEP_TYPE, GameMap } from "../GameMap";
import { VehicleUpgradeSystem } from "../VehicleUpgradeSystem";
import { Wave } from "./Wave";

export const SIX: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 8,
        unitTypeId: CREEP_TYPE.SKELETAL_MAGE,
      },
      {
        delay: 0.3,
        count: 3,
        unitTypeId: CREEP_TYPE.MEAT_WAGON,
      },
    ],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.ANCIENT_SKELETAL_MAGE,
      },
    ],
  ],
  bonusUpgrades: [new MagicResistance()],
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem) => {
    for (const playerId of GameMap.ONLINE_PLAYER_ID_LIST) {
      if (GameMap.IS_PLAYER_DEFEATED[playerId]) continue;

      vehicleUpgradeSystem.addFreeRerolls(playerId, 3);
    }

    const spawnSkeletonSound = Sound.create(
      Sounds.TOMB_OF_RELICS,
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
