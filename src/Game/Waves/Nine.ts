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
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem, playerId: number) => {
    vehicleUpgradeSystem.addFreeRerolls(playerId, 3);

    const spawnSkeletonSound = Sound.create(
      Sounds.NO_GUTS_NO_GLORY,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON",
    );

    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;

    spawnSkeletonSound.start();
    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, "|Cffff0000KEEP MOVING!|r");
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
