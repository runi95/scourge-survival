import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Landslide's boulders (see Landslide.ts): the hit of each boulder on the
// enemy it was lobbed at is handed to its recipe, which rolls it on
export class LandslideDamageEvent implements DamageEvent {
  // The boulders by handle id, with the enemy they were lobbed at and what to
  // do once it is hit
  public static readonly BOULDERS = new Map<
    number,
    { target: Unit; landed: (this: void) => void }
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (LandslideDamageEvent.BOULDERS.size === 0) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const boulder = LandslideDamageEvent.BOULDERS.get(
      damageInstance.sourceUnitId,
    );
    if (boulder == null) return;
    if (Unit.fromHandle(damageInstance.target) !== boulder.target) return;
    LandslideDamageEvent.BOULDERS.delete(damageInstance.sourceUnitId);
    boulder.landed();
  }
}
