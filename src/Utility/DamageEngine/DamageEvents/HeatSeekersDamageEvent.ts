import { Effect, Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export interface Burning {
  unit: Unit;
  playerId: number;
  // Seconds of burning left
  left: number;
  effect: Effect;
}

// Heat Seekers' fireballs (see HeatSeekers.ts) set every enemy they hit on
// fire for 5 seconds
export class HeatSeekersDamageEvent implements DamageEvent {
  private readonly fireballUnitTypeId = FourCC("u02P");
  // Burning scourge units by handle id
  public static readonly BURNING = new Map<number, Burning>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.fireballUnitTypeId) return;

    const burning = HeatSeekersDamageEvent.BURNING.get(
      damageInstance.targetUnitId,
    );
    if (burning != null) {
      burning.left = 5;
      burning.playerId = damageInstance.sourceOwningPlayerId;
      return;
    }
    const unit = Unit.fromHandle(damageInstance.target);
    HeatSeekersDamageEvent.BURNING.set(damageInstance.targetUnitId, {
      unit,
      playerId: damageInstance.sourceOwningPlayerId,
      left: 5,
      effect: Effect.createAttachment(
        "Abilities/Spells/Other/BreathOfFire/BreathOfFireDamage.mdl",
        unit,
        "chest",
      ),
    });
  }
}
