import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Beaters' wolves (see Beaters.ts): every bite of one on a scourge
// unit is handed to its recipe, which shoves the unit bitten
export class BeatersDamageEvent implements DamageEvent {
  // The wolves by handle id, with what to do with the unit bitten
  public static readonly WOLVES = new Map<
    number,
    (this: void, bitten: Unit) => void
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (BeatersDamageEvent.WOLVES.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const bite = BeatersDamageEvent.WOLVES.get(damageInstance.sourceUnitId);
    if (bite == null) return;
    bite(Unit.fromHandle(damageInstance.target));
  }
}
