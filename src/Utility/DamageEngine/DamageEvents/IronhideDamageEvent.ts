import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class IronhideDamageEvent implements DamageEvent {
  public static readonly ACTIVE = new Map<number, boolean>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;
    if (IronhideDamageEvent.ACTIVE.get(damageInstance.targetUnitId) !== true)
      return;

    damageInstance.damage *= 0.75;
  }
}
