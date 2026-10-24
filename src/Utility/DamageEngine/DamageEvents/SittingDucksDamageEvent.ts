import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Sitting Ducks' spears (see SittingDucks.ts): 50% harder for every second
// their target has stood still, up to 3 times as hard
export class SittingDucksDamageEvent implements DamageEvent {
  private readonly spearUnitTypeId = FourCC("u02O");
  // Seconds each scourge unit near a Sitting Ducks hero has stood still, by
  // handle id
  public static readonly STILL = new Map<number, number>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceUnitTypeId !== this.spearUnitTypeId) return;

    const still = SittingDucksDamageEvent.STILL.get(
      damageInstance.targetUnitId,
    );
    if (still == null) return;
    damageInstance.damage =
      damageInstance.damage * (1 + 0.5 * Math.min(4, still));
  }
}
