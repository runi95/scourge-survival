import { TextTag } from "w3ts/index";
import { GameMap } from "../../../Game/GameMap";
import { RandomNumberGenerator } from "../../RandomNumberGenerator";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class CriticalStrikeDamageEvent implements DamageEvent {
  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const vehicle =
      this.gameMap.playerVehicles[damageInstance.sourceOwningPlayerId];
    if (vehicle == null) return;

    const criticalStrikeLevel = vehicle.upgradeMap.get("Critical Strike");
    if (criticalStrikeLevel == null) return;
    if (criticalStrikeLevel < 1) return;

    const randomNumber: number = RandomNumberGenerator.random(1, 100);
    if (randomNumber > 20) return;

    damageInstance.damage *= 1 + criticalStrikeLevel;
    const txt = TextTag.create();
    txt.setText(`${Math.floor(damageInstance.damage).toString()}!`, 0.023);
    txt.setPos(
      GetUnitX(damageInstance.source),
      GetUnitY(damageInstance.source),
      BlzGetUnitZ(damageInstance.source)
    );
    txt.setColor(255.0, 0.0, 0.0, 255.0);
    txt.setPermanent(false);
    txt.setLifespan(4.0);
    txt.setVelocity(0, 0.04);
    txt.setFadepoint(2.5);
  }
}
