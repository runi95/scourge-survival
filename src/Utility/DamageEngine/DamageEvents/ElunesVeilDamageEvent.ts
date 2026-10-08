import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class ElunesVeilDamageEvent implements DamageEvent {
  private readonly elunesVeilAbilityId: number = FourCC("A00Q");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;

    const vehicle =
      GameMap.PLAYER_VEHICLES[damageInstance.targetOwningPlayerId];
    if (vehicle.unit == null) return;
    if (vehicle.unit.handle !== damageInstance.target) return;

    // Night is 18:00 to 6:00
    const timeOfDay = GetFloatGameState(GAME_STATE_TIME_OF_DAY);
    if (timeOfDay >= 6 && timeOfDay < 18) return;

    const elunesVeilLevel = vehicle.unit.getAbilityLevel(
      this.elunesVeilAbilityId,
    );
    if (elunesVeilLevel < 1) return;

    damageInstance.damage *= 0.75;
  }
}
