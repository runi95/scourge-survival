import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

const HEAL_FACTOR = 0.5;

// Heals the owner's hero for part of every Locust Swarm bite (see LocustSwarm.ts)
export class LocustSwarmDamageEvent implements DamageEvent {
  private readonly locustUnitTypeId = FourCC("u00R");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.locustUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const vehicle =
      GameMap.PLAYER_VEHICLES[damageInstance.sourceOwningPlayerId];
    if (vehicle?.unit == null || !vehicle.unit.isAlive()) return;

    vehicle.unit.life = vehicle.unit.life + HEAL_FACTOR * damageInstance.damage;
  }
}
