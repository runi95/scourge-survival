import { Trigger, Unit } from "w3ts/index";
import { GameMap } from "../../Game/GameMap";

export class ManaLeech {
  private readonly manaLeechTrig: Trigger;

  constructor() {
    this.manaLeechTrig = Trigger.create();
    this.manaLeechTrig.addAction(() => {
      const killingUnit = GetKillingUnit();
      if (killingUnit == null) return;

      const trig = Unit.fromHandle(killingUnit);
      const vehicle = GameMap.PLAYER_VEHICLES[trig.owner.id];
      if (vehicle.unit == null) return;

      const manaLeechLevel = vehicle.upgradeMap.get("Mana Leech");
      if (manaLeechLevel == null) return;
      if (manaLeechLevel < 1) return;

      vehicle.unit.mana = vehicle.unit.mana + 5 * manaLeechLevel;
    });
    this.manaLeechTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }
}
