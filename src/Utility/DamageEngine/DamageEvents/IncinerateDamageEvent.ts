import { Effect, Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export interface Fire {
  // Rockets that hit it, up to 10
  stacks: number;
  playerId: number;
  effect: Effect;
}

// Incinerate's rockets (see Incinerate.ts): 10 more for every rocket that hit
// the target before, up to 100 more
export class IncinerateDamageEvent implements DamageEvent {
  private readonly rocketUnitTypeId = FourCC("u00Q");
  // Incinerated scourge units by handle id
  public static readonly FIRES = new Map<number, Fire>();

  public static ignite(target: Unit, playerId: number, stacks: number): void {
    const fire = IncinerateDamageEvent.FIRES.get(target.id);
    if (fire != null) {
      fire.stacks = Math.min(10, fire.stacks + stacks);
      fire.playerId = playerId;
      return;
    }
    IncinerateDamageEvent.FIRES.set(target.id, {
      stacks: Math.min(10, stacks),
      playerId,
      effect: Effect.createAttachment(
        "Abilities/Spells/Other/Incinerate/IncinerateBuff.mdl",
        target,
        "chest",
      ),
    });
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.rocketUnitTypeId) return;

    const fire = IncinerateDamageEvent.FIRES.get(damageInstance.targetUnitId);
    if (fire != null) damageInstance.damage += 10 * fire.stacks;
    IncinerateDamageEvent.ignite(
      Unit.fromHandle(damageInstance.target),
      damageInstance.sourceOwningPlayerId,
      1,
    );
  }
}
