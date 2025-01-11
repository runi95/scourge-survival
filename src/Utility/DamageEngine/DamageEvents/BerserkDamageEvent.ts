import { TextTag } from "w3ts/index";
import { GameMap } from "../../../Game/GameMap";
import { RandomNumberGenerator } from "../../RandomNumberGenerator";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class BerserkDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (BerserkDamageEvent.READY_INSTANCES === 0) return;

    if (damageInstance.sourceOwningPlayerId < 9) {
      const vehicle =
        this.gameMap.playerVehicles[damageInstance.sourceOwningPlayerId];
      if (vehicle == null) return;

      const berserkLevel = vehicle.upgradeMap.get("Berserk");
      if (berserkLevel == null) return;
      if (berserkLevel < 1) return;

      damageInstance.damage *= 1.5;
    } else {
      const vehicle =
        this.gameMap.playerVehicles[damageInstance.sourceOwningPlayerId - 9];
      if (vehicle == null) return;

      const berserkLevel = vehicle.upgradeMap.get("Berserk");
      if (berserkLevel == null) return;
      if (berserkLevel < 1) return;

      damageInstance.damage *= 1.3;
    }
  }
}
