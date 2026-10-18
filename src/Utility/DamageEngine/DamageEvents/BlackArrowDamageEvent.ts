import { MapPlayer } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { TimerUtils } from "../../TimerUtils";

// Marks every enemy a black arrow hits for 5 seconds (see BlackArrow.ts)
export class BlackArrowDamageEvent implements DamageEvent {
  // Who shot each marked enemy, by handle id
  public static readonly MARKED = new Map<number, MapPlayer>();

  private readonly arrowUnitTypeId = FourCC("u02A");
  // How many arrows each marked enemy carries, so the last one to wear off
  // takes the mark with it
  private readonly arrows = new Map<number, number>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.arrowUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const id = damageInstance.targetUnitId;
    BlackArrowDamageEvent.MARKED.set(
      id,
      MapPlayer.fromHandle(damageInstance.sourceOwningPlayer),
    );
    this.arrows.set(id, (this.arrows.get(id) ?? 0) + 1);
    const t = TimerUtils.newTimer();
    t.start(5, false, () => {
      TimerUtils.releaseTimer(t);
      const left = (this.arrows.get(id) ?? 1) - 1;
      if (left > 0) {
        this.arrows.set(id, left);
        return;
      }
      this.arrows.delete(id);
      BlackArrowDamageEvent.MARKED.delete(id);
    });
  }
}
