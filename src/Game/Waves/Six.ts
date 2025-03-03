import { MagicResistance } from "../CreepUpgrades/MagicResistance";
import { CREEP_TYPE, GameMap } from "../GameMap";
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
