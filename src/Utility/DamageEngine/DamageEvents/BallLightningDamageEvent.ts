import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Ball Lightning's balls (see BallLightning.ts): the hit of each ball on the
// enemy it was lobbed at is handed to its recipe, which bounces it on
export class BallLightningDamageEvent implements DamageEvent {
  // The balls by handle id, with the enemy they were lobbed at and what to
  // do once it is hit
  public static readonly BALLS = new Map<
    number,
    { target: Unit; landed: (this: void) => void }
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (BallLightningDamageEvent.BALLS.size === 0) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const ball = BallLightningDamageEvent.BALLS.get(
      damageInstance.sourceUnitId,
    );
    if (ball == null) return;
    if (Unit.fromHandle(damageInstance.target) !== ball.target) return;
    BallLightningDamageEvent.BALLS.delete(damageInstance.sourceUnitId);
    ball.landed();
  }
}
