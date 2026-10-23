import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Garrote (see Garrote.ts): remembers the enemy that last struck each hero
// that carries a Garrote
export class GarroteDamageEvent implements DamageEvent {
  // How many Garrote items each hero carries, by handle id
  public static readonly WATCHED = new Map<number, number>();
  // The enemy that last struck each watched hero, by the hero's handle id
  public static readonly LAST_ATTACKER = new Map<number, Unit>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (GarroteDamageEvent.WATCHED.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;
    if (!GarroteDamageEvent.WATCHED.has(damageInstance.targetUnitId)) return;

    GarroteDamageEvent.LAST_ATTACKER.set(
      damageInstance.targetUnitId,
      Unit.fromHandle(damageInstance.source),
    );
  }
}
