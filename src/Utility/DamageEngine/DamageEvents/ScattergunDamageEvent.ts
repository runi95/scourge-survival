import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class ScattergunDamageEvent implements DamageEvent {
  private readonly scattergunUnitTypeId = FourCC("u011");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.scattergunUnitTypeId) return;

    const distance = Math.sqrt(
      Math.pow(
        GetUnitX(damageInstance.source) - GetUnitX(damageInstance.target),
        2,
      ) +
        Math.pow(
          GetUnitY(damageInstance.source) - GetUnitY(damageInstance.target),
          2,
        ),
    );
    damageInstance.damage = 90 - 75 * Math.min(1, distance / 500);
  }
}
