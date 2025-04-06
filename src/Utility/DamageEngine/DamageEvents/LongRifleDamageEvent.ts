import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class LongRifleDamageEvent implements DamageEvent {
  private readonly longRifleUnitTypeId = FourCC("u00O");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.longRifleUnitTypeId) return;

    const distance = Math.sqrt(
      Math.pow(
        GetUnitX(damageInstance.source) - GetUnitX(damageInstance.target),
        2
      ) +
        Math.pow(
          GetUnitY(damageInstance.source) - GetUnitY(damageInstance.target),
          2
        )
    );
    damageInstance.damage = Math.max(
      75,
      Math.min(1500, Math.round(distance / 1500)) * damageInstance.damage
    );
  }
}
