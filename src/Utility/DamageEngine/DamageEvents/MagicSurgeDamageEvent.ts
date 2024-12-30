import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class MagicSurgeDamageEvent implements DamageEvent {
  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId !== 23) return;

    const vehicle =
      this.gameMap.playerVehicles[damageInstance.sourceOwningPlayerId];
    if (vehicle == null) return;

    const magicSurgeLevel = vehicle.upgradeMap.get("Magic Surge");
    if (magicSurgeLevel == null) return;
    if (magicSurgeLevel < 1) return;

    const mult = GetUnitManaPercent(vehicle.unit.handle);
    if (mult > 99) return;

    damageInstance.damage *= (100 - mult) / 100;
  }
}
