import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class BansheeShellDamageEvent implements DamageEvent {
  public static readonly REMAINING: number[] = [];

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage <= 0) return;
    if (damageInstance.targetOwningPlayerId > 8) return;

    const playerId = damageInstance.targetOwningPlayerId;
    const remaining = BansheeShellDamageEvent.REMAINING[playerId] ?? 0;
    if (remaining <= 0) return;

    const vehicle = GameMap.PLAYER_VEHICLES[playerId];
    if (vehicle.unit == null || vehicle.unit.handle !== damageInstance.target)
      return;

    const absorbed = Math.min(damageInstance.damage, remaining);
    BansheeShellDamageEvent.REMAINING[playerId] = remaining - absorbed;
    damageInstance.damage -= absorbed;
  }
}
