import { CREEP_TYPE, GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class UnholyAuraDamageEvent implements DamageEvent {
  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.targetUnitTypeId !== CREEP_TYPE.DEATHLESS_NECROMANCER)
      return;
    if (
      GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(
        damageInstance.targetOwningPlayerId
      ) < 2
    )
      return;

    damageInstance.damage = 0;
  }
}
