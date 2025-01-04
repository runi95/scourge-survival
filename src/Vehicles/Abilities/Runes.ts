import { Trigger, Unit } from "w3ts/index";
import { GameMap } from "../../Game/GameMap";
import { RandomNumberGenerator } from "../../Utility/RandomNumberGenerator";

export class Runes {
  private readonly gameMap: GameMap;
  private readonly runesTrig: Trigger;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.runesTrig = Trigger.create();
    this.runesTrig.addAction(() => {
      const killingUnit = GetKillingUnit();
      if (killingUnit == null) return;

      const dyingUnit = Unit.fromEvent();
      if (dyingUnit.owner.id < 9) return;

      const { x, y } = dyingUnit;
      const runeDrop = RandomNumberGenerator.random(1, 100);
      if (runeDrop >= 90) {
        if (runeDrop <= 92) {
          // Rune of Speed
          CreateItem(FourCC("I007"), x, y);
        } else if (runeDrop <= 94) {
          // Rune of Restoration
          CreateItem(FourCC("I008"), x, y);
        } else if (runeDrop <= 96) {
          // Rune of Lesser Healing
          CreateItem(FourCC("I00B"), x, y);
        } else if (runeDrop <= 97) {
          // Rune of Mana
          CreateItem(FourCC("I009"), x, y);
        } else if (runeDrop <= 98) {
          // Rune of Healing
          CreateItem(FourCC("I00A"), x, y);
        } else if (runeDrop <= 99) {
          // Rune of Greater Mana
          CreateItem(FourCC("I00C"), x, y);
        } else {
          // Rune of Greater Healing
          CreateItem(FourCC("I00D"), x, y);
        }

        return;
      }

      const trig = Unit.fromHandle(killingUnit);
      const vehicle = this.gameMap.playerVehicles[trig.owner.id];
      if (vehicle == null) return;
      const glyphLevel = vehicle.upgradeMap.get("Glyph");
      if (glyphLevel == null) return;
      if (glyphLevel < 1) return;

      const tomeDrop = RandomNumberGenerator.random(1, 100);
      if (tomeDrop < 80) return;

      if (tomeDrop <= 83) {
        // Tome of Agility
        CreateItem(FourCC("I00E"), x, y);
      } else if (tomeDrop <= 86) {
        // Tome of Intelligence
        CreateItem(FourCC("I00F"), x, y);
      } else if (tomeDrop <= 89) {
        // Tome of Strength
        CreateItem(FourCC("I00G"), x, y);
      } else if (tomeDrop <= 92) {
        // Manual of Health
        CreateItem(FourCC("I00H"), x, y);
      } else if (tomeDrop <= 94) {
        // Tome of Agility +2
        CreateItem(FourCC("I00I"), x, y);
      } else if (tomeDrop <= 96) {
        // Tome of Intelligence +2
        CreateItem(FourCC("I00J"), x, y);
      } else if (tomeDrop <= 98) {
        // Tome of Strength +2
        CreateItem(FourCC("I00K"), x, y);
      } else {
        // Tome of Knowledge
        CreateItem(FourCC("I00L"), x, y);
      }
    });
    this.runesTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }
}
