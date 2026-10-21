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
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem, playerId: number) => {
    vehicleUpgradeSystem.addFreeRerolls(playerId, 3);

    const spawnSkeletonSound = Sound.create(
      Sounds.TOMB_OF_RELICS,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON",
    );

    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;

    spawnSkeletonSound.start();
    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, `Free rerolls: |cffffcc00+3|r`);

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
