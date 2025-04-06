import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class LongRifleDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;
  public static PLAYER_LONG_RIFLE_COUNT: number[] = [];
  private readonly longRifleUnitTypeId = FourCC("u00O");

  constructor() {
    for (let i = 0; i < bj_MAX_PLAYERS; i++) {
      LongRifleDamageEvent.PLAYER_LONG_RIFLE_COUNT[i] = 0;
    }
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (LongRifleDamageEvent.READY_INSTANCES === 0) return;
    const count =
      LongRifleDamageEvent.PLAYER_LONG_RIFLE_COUNT[
        damageInstance.sourceOwningPlayerId
      ];
    if (count == null) return;
    if (count < 1) return;
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
