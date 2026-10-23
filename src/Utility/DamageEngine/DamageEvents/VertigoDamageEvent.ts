import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Vertigo's dizzy enemies (see Vertigo.ts): every attack one of them lands on
// another scourge unit is handed to its recipe, which poisons the one struck
export class VertigoDamageEvent implements DamageEvent {
  // The dizzy enemies by handle id, with what to do with the unit struck
  public static readonly REELING = new Map<number, (struck: Unit) => void>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (VertigoDamageEvent.REELING.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const strike = VertigoDamageEvent.REELING.get(damageInstance.sourceUnitId);
    if (strike == null) return;
    strike(Unit.fromHandle(damageInstance.target));
  }
}
