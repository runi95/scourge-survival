import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class BerserkDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (BerserkDamageEvent.READY_INSTANCES === 0) return;

    if (damageInstance.sourceOwningPlayerId < 9) {
      if (damageInstance.targetOwningPlayerId > 8) return;
      const vehicle =
        GameMap.PLAYER_VEHICLES[damageInstance.sourceOwningPlayerId];
      if (vehicle.unit == null) return;

      const berserkLevel = vehicle.upgradeMap.get("Berserk");
      if (berserkLevel == null) return;
      if (berserkLevel < 1) return;

      damageInstance.damage *= 1.5;
    } else {
      if (damageInstance.targetOwningPlayerId > 8) return;
      const vehicle =
        GameMap.PLAYER_VEHICLES[damageInstance.sourceOwningPlayerId - 9];
      if (vehicle.unit == null) return;

      const berserkLevel = vehicle.upgradeMap.get("Berserk");
      if (berserkLevel == null) return;
      if (berserkLevel < 1) return;

      damageInstance.damage *= 1.3;
    }
  }
}
