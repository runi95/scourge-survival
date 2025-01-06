import { TextTag } from "w3ts/index";
import { GameMap } from "../../../Game/GameMap";
import { RandomNumberGenerator } from "../../RandomNumberGenerator";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class ThornsDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (ThornsDamageEvent.READY_INSTANCES === 0) return;
    if (damageInstance.damageType === DAMAGE_TYPE_DEFENSIVE) return;

    const vehicle =
      this.gameMap.playerVehicles[damageInstance.targetOwningPlayerId];
    if (vehicle == null) return;

    const thornsLevel = vehicle.upgradeMap.get("Thorns");
    if (thornsLevel == null) return;
    if (thornsLevel < 1) return;

    const damage = damageInstance.damage * 0.06 * thornsLevel;
    if (damage < 0.5) return;

    UnitDamageTarget(
      damageInstance.target,
      damageInstance.source,
      damage,
      false,
      false,
      ATTACK_TYPE_MAGIC,
      DAMAGE_TYPE_DEFENSIVE,
      WEAPON_TYPE_WHOKNOWS
    );
  }
}
