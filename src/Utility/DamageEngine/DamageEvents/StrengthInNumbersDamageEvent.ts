import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class StrengthInNumbersDamageEvent implements DamageEvent {
  public static IS_ENABLED = false;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (!StrengthInNumbersDamageEvent.IS_ENABLED) return;
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const remainingCreepCount = GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(
      damageInstance.targetOwningPlayerId
    );
    if (remainingCreepCount == null) return;
    if (remainingCreepCount < 2) return;

    damageInstance.damage *=
      1 - Math.min(0.25, 0.011 * (remainingCreepCount - 1));
  }
}
