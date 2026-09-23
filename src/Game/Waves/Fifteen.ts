import { CREEP_TYPE, GameMap } from "../GameMap";
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
  before: () => {
    const localPlayerArea =
      GameMap.PLAYER_AREAS[GetPlayerId(GetLocalPlayer())];
    if (localPlayerArea == null) return;

    PingMinimapEx(
      localPlayerArea.maxX - 640,
      localPlayerArea.minY + 640,
      4,
      255,
      0,
      0,
      true
    );
  },
};
