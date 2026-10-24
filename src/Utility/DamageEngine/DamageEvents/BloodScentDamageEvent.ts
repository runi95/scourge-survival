import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { TimerUtils } from "../../TimerUtils";

// Blood Scent's boulders and wolves (see BloodScent.ts): every scourge unit a
// boulder hurts bleeds for 5 seconds, and a wolf's bite on a bleeding one is
// doubled
export class BloodScentDamageEvent implements DamageEvent {
  // The boulders and wolves by handle id
  public static readonly BOULDERS = new Set<number>();
  public static readonly WOLVES = new Set<number>();
  // The bleeding units by handle id, with the number of their latest wound
  public static readonly BLEEDING = new Map<number, number>();
  private wounds = 0;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (
      BloodScentDamageEvent.BOULDERS.size === 0 &&
      BloodScentDamageEvent.WOLVES.size === 0
    ) {
      return;
    }
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const source = damageInstance.sourceUnitId;
    const target = damageInstance.targetUnitId;
    if (BloodScentDamageEvent.WOLVES.has(source)) {
      if (BloodScentDamageEvent.BLEEDING.has(target)) {
        damageInstance.damage = 2 * damageInstance.damage;
      }
      return;
    }
    if (!BloodScentDamageEvent.BOULDERS.has(source)) return;

    const wound = ++this.wounds;
    BloodScentDamageEvent.BLEEDING.set(target, wound);
    const t = TimerUtils.newTimer();
    t.start(5, false, () => {
      TimerUtils.releaseTimer(t);
      if (BloodScentDamageEvent.BLEEDING.get(target) === wound) {
        BloodScentDamageEvent.BLEEDING.delete(target);
      }
    });
  }
}
