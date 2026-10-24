import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Thunder Fangs' wolves (see ThunderFangs.ts): every bite of one on a scourge
// unit is handed to its recipe, which counts them
export class ThunderFangsDamageEvent implements DamageEvent {
  // The wolves by handle id, with what to do with the unit bitten
  public static readonly WOLVES = new Map<
    number,
    (this: void, bitten: Unit) => void
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (ThunderFangsDamageEvent.WOLVES.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const bite = ThunderFangsDamageEvent.WOLVES.get(
      damageInstance.sourceUnitId,
    );
    if (bite == null) return;
    bite(Unit.fromHandle(damageInstance.target));
  }
}
