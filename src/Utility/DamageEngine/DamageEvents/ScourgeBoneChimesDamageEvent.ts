import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class ScourgeBoneChimesDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (ScourgeBoneChimesDamageEvent.READY_INSTANCES === 0) return;
    if (damageInstance.damageType === DAMAGE_TYPE_DEFENSIVE) return;

    const vehicle =
      GameMap.PLAYER_VEHICLES[damageInstance.sourceOwningPlayerId];
    if (vehicle.unit == null) return;

    const scourgeBoneChimesLevel = vehicle.upgradeMap.get(
      "Scourge Bone Chimes"
    );
    if (scourgeBoneChimesLevel == null) return;
    if (scourgeBoneChimesLevel < 1) return;

    vehicle.unit.life = vehicle.unit.life + 0.12 * damageInstance.damage;
  }
}
