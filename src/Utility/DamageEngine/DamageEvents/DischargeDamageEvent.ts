import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Discharge's chain lightning (see Discharge.ts): every scourge unit a
// caster's lightning hits is handed to its recipe, which charges it
export class DischargeDamageEvent implements DamageEvent {
  // The chain lightning casters by handle id, with what to do with the unit
  // hit
  public static readonly CASTERS = new Map<
    number,
    (this: void, struck: Unit) => void
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (DischargeDamageEvent.CASTERS.size === 0) return;
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const charge = DischargeDamageEvent.CASTERS.get(
      damageInstance.sourceUnitId,
    );
    if (charge == null) return;
    charge(Unit.fromHandle(damageInstance.target));
  }
}
