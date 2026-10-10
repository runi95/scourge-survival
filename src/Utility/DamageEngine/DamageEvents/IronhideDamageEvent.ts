import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class IronhideDamageEvent implements DamageEvent {
  public static readonly ACTIVE_LEVEL_MAP = new Map<number, number>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;

    const level = IronhideDamageEvent.ACTIVE_LEVEL_MAP.get(
      damageInstance.targetUnitId,
    );
    if (level == null) return;

    damageInstance.damage *= [0.9, 0.85, 0.8, 0.75, 0.7][level];
  }
}
