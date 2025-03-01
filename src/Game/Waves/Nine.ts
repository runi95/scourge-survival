import { CREEP_TYPE, GameMap } from "../GameMap";
import { Wave } from "./Wave";

export const NINE: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 8,
        unitTypeId: CREEP_TYPE.GHOUL,
      },
    ],
    [
      {
        delay: 0.1,
        count: 1,
        unitTypeId: CREEP_TYPE.CRAZED_GHOUL,
      },
    ],
  ],
  bonusUpgrades: [new Bash()],
  before: () => {
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
