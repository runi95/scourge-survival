import { Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { IronhideDamageEvent } from "../../Utility/DamageEngine/DamageEvents/IronhideDamageEvent";

export class Ironhide {
  private readonly ironhideAbilityId = FourCC("A00V");

  constructor() {
    const orderTrig = Trigger.create();
    orderTrig.addAction(() => {
      const unit = Unit.fromEvent();
      if (unit.getAbilityLevel(this.ironhideAbilityId) < 1) return;

      const order = GetIssuedOrderId();
      if (order === OrderId.Defend) {
        IronhideDamageEvent.ACTIVE.set(unit.id, true);
      } else if (order === OrderId.Undefend) {
        IronhideDamageEvent.ACTIVE.set(unit.id, false);
      }
    });
    orderTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_ISSUED_ORDER);
  }
}
