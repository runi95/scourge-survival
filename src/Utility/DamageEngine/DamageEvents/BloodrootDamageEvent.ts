import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Bloodroot's spears (see Bloodroot.ts): every spear that lands is handed to
// its recipe, which seeds the enemy struck
export class BloodrootDamageEvent implements DamageEvent {
  // The spear throwers by handle id, with what to do with the enemy struck
  public static readonly SPEARS = new Map<number, (struck: Unit) => void>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (BloodrootDamageEvent.SPEARS.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const strike = BloodrootDamageEvent.SPEARS.get(damageInstance.sourceUnitId);
    if (strike == null) return;
    BloodrootDamageEvent.SPEARS.delete(damageInstance.sourceUnitId);
    strike(Unit.fromHandle(damageInstance.target));
  }
}
