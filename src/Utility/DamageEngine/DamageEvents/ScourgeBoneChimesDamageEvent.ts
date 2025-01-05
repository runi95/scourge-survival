import { TextTag } from "w3ts/index";
import { GameMap } from "../../../Game/GameMap";
import { RandomNumberGenerator } from "../../RandomNumberGenerator";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class ScourgeBoneChimesDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (ScourgeBoneChimesDamageEvent.READY_INSTANCES === 0) return;

    const vehicle =
      this.gameMap.playerVehicles[damageInstance.sourceOwningPlayerId];
    if (vehicle == null) return;

    const scourgeBoneChimesLevel = vehicle.upgradeMap.get(
      "Scourge Bone Chimes"
    );
    if (scourgeBoneChimesLevel == null) return;
    if (scourgeBoneChimesLevel < 1) return;

    vehicle.unit.life = vehicle.unit.life + 0.4 * damageInstance.damage;
  }
}
