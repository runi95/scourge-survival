import { CREEP_TYPE, GameMap } from "../GameMap";
import { Wave } from "./Wave";

export const FIFTEEN: Wave = {
  portals: [
    [
      {
        delay: 0.1,
        count: 10,
        unitTypeId: CREEP_TYPE.SHADE,
      },
    ],
    [],
  ],
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
