import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Sneak Attack's Treants (see SneakAttack.ts): every attack one of them lands
// on an enemy is handed to its recipe, which turns the enemy on that Treant
export class SneakAttackDamageEvent implements DamageEvent {
  // The Treants by handle id, with what to do with the enemy struck
  public static readonly BRAWLERS = new Map<number, (struck: Unit) => void>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (SneakAttackDamageEvent.BRAWLERS.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const strike = SneakAttackDamageEvent.BRAWLERS.get(
      damageInstance.sourceUnitId,
    );
    if (strike == null) return;
    strike(Unit.fromHandle(damageInstance.target));
  }
}
