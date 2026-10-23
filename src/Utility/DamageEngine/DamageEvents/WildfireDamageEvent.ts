import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Wildfire's kindling Treants (see Wildfire.ts): every attack one of them lands
// on an enemy is handed to its recipe, which spreads the fire when the enemy
// burns
export class WildfireDamageEvent implements DamageEvent {
  // The kindling Treants by handle id, with what to do with the enemy struck
  public static readonly KINDLING = new Map<number, (struck: Unit) => void>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (WildfireDamageEvent.KINDLING.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const strike = WildfireDamageEvent.KINDLING.get(
      damageInstance.sourceUnitId,
    );
    if (strike == null) return;
    strike(Unit.fromHandle(damageInstance.target));
  }
}
