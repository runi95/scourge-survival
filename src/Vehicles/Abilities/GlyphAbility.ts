import { MapPlayer, Trigger, Unit } from "w3ts";
import { GameMap } from "../../Game/GameMap";
import { RandomNumberGenerator } from "../../Utility/RandomNumberGenerator";

export class GlyphAbility {
  public static PLAYER_ID_UNLOCKS: boolean[] = [];
  private readonly runesTrig: Trigger;

  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.runesTrig = Trigger.create();
    this.runesTrig.addAction(() => {
      const killingUnit = GetKillingUnit();
      if (killingUnit == null) return;

      const dyingUnit = Unit.fromEvent();
      const playerId = dyingUnit.owner.id;
      if (playerId < 9) return;

      const vehicle = this.gameMap.playerVehicles[playerId - 9];
      if (vehicle == null) return;

      const glyphLevel = vehicle.upgradeMap.get("Glyph");
      if (glyphLevel == null) return;
      if (glyphLevel < 1) return;

      const rand = RandomNumberGenerator.random(1, 30);
      if (rand < 11) {
        vehicle.unit.setStrength(vehicle.unit.strength + glyphLevel, true);
      } else if (rand < 21) {
        vehicle.unit.setAgility(vehicle.unit.agility + glyphLevel, true);
      } else {
        vehicle.unit.setIntelligence(
          vehicle.unit.intelligence + glyphLevel,
          true
        );
      }
    });

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
      this.runesTrig.registerPlayerUnitEvent(
        MapPlayer.fromIndex(playerId + 9),
        EVENT_PLAYER_UNIT_DEATH,
        () => GlyphAbility.PLAYER_ID_UNLOCKS[playerId]
      );
    }
  }
}
