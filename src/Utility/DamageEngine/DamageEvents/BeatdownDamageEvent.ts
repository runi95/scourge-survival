import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { StunUtils } from "../../StunUtils";
import { TimerUtils } from "../../TimerUtils";

// Beatdown's javelins (see Beatdown.ts): one that hits a stunned enemy deals
// double damage and keeps it stunned 0.5 s longer, up to 2 s longer per enemy
// every 4 seconds
export class BeatdownDamageEvent implements DamageEvent {
  private readonly javelinUnitTypeId = FourCC("u02M");
  // Seconds of stun the javelins have added to each enemy by handle id
  private readonly extended = new Map<number, number>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceUnitTypeId !== this.javelinUnitTypeId) return;

    const target = damageInstance.target;
    const id = damageInstance.targetUnitId;
    if (!StunUtils.isStunned(id)) return;
    damageInstance.damage = 2 * damageInstance.damage;

    const extended = this.extended.get(id);
    if (extended == null) {
      const t = TimerUtils.newTimer();
      t.start(4, false, () => {
        TimerUtils.releaseTimer(t);
        this.extended.delete(id);
      });
    } else if (extended >= 2) return;
    this.extended.set(id, (extended ?? 0) + 0.5);
    StunUtils.stunUnit(target, 0.5);
  }
}
