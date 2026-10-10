import { Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { IronhideDamageEvent } from "../../Utility/DamageEngine/DamageEvents/IronhideDamageEvent";

export class Ironhide {
  private readonly ironhideAbilityId = FourCC("A00V");

  constructor() {
    const orderTrig = Trigger.create();
    orderTrig.addAction(() => {
      const unit = Unit.fromEvent();
      const level = unit.getAbilityLevel(this.ironhideAbilityId);
      if (level < 1) return;

      const order = GetIssuedOrderId();
      if (order === OrderId.Defend) {
        IronhideDamageEvent.ACTIVE_LEVEL_MAP.set(unit.id, level);
      } else if (order === OrderId.Undefend) {
        IronhideDamageEvent.ACTIVE_LEVEL_MAP.delete(unit.id);
      }
    });
    orderTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_ISSUED_ORDER);
  }
}
