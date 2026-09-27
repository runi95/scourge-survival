import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class OverdriveDamageEvent implements DamageEvent {
  public static readonly ACTIVE: boolean[] = [];

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;

    if (!OverdriveDamageEvent.ACTIVE[damageInstance.sourceOwningPlayerId])
      return;

    damageInstance.damage *= 2;
  }
}
