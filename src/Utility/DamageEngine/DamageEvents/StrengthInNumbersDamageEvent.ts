import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class StrengthInNumbersDamageEvent implements DamageEvent {
  // By scourge player id
  public static readonly IS_ENABLED: boolean[] = [];

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (
      !StrengthInNumbersDamageEvent.IS_ENABLED[
        damageInstance.targetOwningPlayerId
      ]
    )
      return;

    const remainingCreepCount = GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(
      damageInstance.targetOwningPlayerId,
    );
    if (remainingCreepCount == null) return;
    if (remainingCreepCount < 2) return;

    damageInstance.damage *=
      1 - Math.min(0.25, 0.011 * (remainingCreepCount - 1));
  }
}
