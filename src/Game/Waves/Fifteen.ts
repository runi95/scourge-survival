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
  before: (vehicleUpgradeSystem: VehicleUpgradeSystem) => {
    for (const playerId of GameMap.ONLINE_PLAYER_ID_LIST) {
      if (GameMap.IS_PLAYER_DEFEATED[playerId]) continue;

      vehicleUpgradeSystem.addFreeRerolls(playerId, 3);
    }

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
