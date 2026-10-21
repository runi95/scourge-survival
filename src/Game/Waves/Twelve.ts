import { Sound } from "w3ts";
import { Sounds } from "../../Utility/Sounds";
import { StrengthInNumbers } from "../CreepUpgrades/StrengthInNumbers";
import { CREEP_TYPE, GameMap } from "../GameMap";
import { VehicleUpgradeSystem } from "../VehicleUpgradeSystem";
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
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem, playerId: number) => {
    vehicleUpgradeSystem.addFreeRerolls(playerId, 3);

    const spawnSkeletonSound = Sound.create(
      Sounds.THEYLL_ALL_BE_MINE_IN_THE_END,
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
