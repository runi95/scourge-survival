import { CREEP_TYPE, GameMap } from "../GameMap";
import { VehicleUpgradeSystem } from "../VehicleUpgradeSystem";
import { Wave } from "./Wave";

export const FIFTEEN: Wave = {
  portals: [
    [],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.GARGOYLE,
      },
    ],
  ],
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem, playerId: number) => {
    vehicleUpgradeSystem.addFreeRerolls(playerId, 3);

    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;

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
