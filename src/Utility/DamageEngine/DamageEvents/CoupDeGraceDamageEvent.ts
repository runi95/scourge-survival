import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Coup de Grace's spears and daggers (see CoupDeGrace.ts): the first hit of
// each thrower is handed to its recipe with the enemy struck
export class CoupDeGraceDamageEvent implements DamageEvent {
  // The spear and dagger throwers by handle id, with what to do with the
  // enemy struck
  public static readonly THROWN = new Map<number, (struck: Unit) => void>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (CoupDeGraceDamageEvent.THROWN.size === 0) return;
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const strike = CoupDeGraceDamageEvent.THROWN.get(
      damageInstance.sourceUnitId,
    );
    if (strike == null) return;
    CoupDeGraceDamageEvent.THROWN.delete(damageInstance.sourceUnitId);
    strike(Unit.fromHandle(damageInstance.target));
  }
}
