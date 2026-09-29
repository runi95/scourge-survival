import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class MarksmanDamageEvent implements DamageEvent {
  private readonly markedBuffId = FourCC("B007");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (GetUnitAbilityLevel(damageInstance.target, this.markedBuffId) === 0)
      return;

    damageInstance.damage *= 1.25;
  }
}
