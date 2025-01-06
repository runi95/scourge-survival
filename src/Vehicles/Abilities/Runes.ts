import { MapPlayer, Trigger, Unit } from "w3ts";
import { RandomNumberGenerator } from "../../Utility/RandomNumberGenerator";
import { GameMap } from "../../Game/GameMap";

export class Runes {
  private readonly runesTrig: Trigger;

  constructor() {
    this.runesTrig = Trigger.create();
    this.runesTrig.addAction(() => {
      const killingUnit = GetKillingUnit();
      if (killingUnit == null) return;

      const dyingUnit = Unit.fromEvent();
      if (dyingUnit.owner.id < 9) return;

      const { x, y } = dyingUnit;
      const runeDrop = RandomNumberGenerator.random(1, 100);
      if (runeDrop < 90) return;
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
    });

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      this.runesTrig.registerPlayerUnitEvent(
        MapPlayer.fromIndex(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9),
        EVENT_PLAYER_UNIT_DEATH,
        undefined
      );
    }
  }
}
