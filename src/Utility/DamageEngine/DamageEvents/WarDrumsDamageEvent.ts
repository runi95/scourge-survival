import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class WarDrumsDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (WarDrumsDamageEvent.READY_INSTANCES === 0) return;

    const vehicle =
      GameMap.PLAYER_VEHICLES[damageInstance.sourceOwningPlayerId];
    if (vehicle.unit == null) return;

    const warDrumsLevel = vehicle.upgradeMap.get("War Drums");
    if (warDrumsLevel == null) return;
    if (warDrumsLevel < 1) return;

    damageInstance.damage *= 1 + 0.3 * warDrumsLevel;
  }
}
