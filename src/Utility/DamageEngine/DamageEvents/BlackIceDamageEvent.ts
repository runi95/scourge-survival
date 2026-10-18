import { Effect, MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { StunUtils } from "../../StunUtils";
import { TimerUtils } from "../../TimerUtils";

interface Chill {
  stacks: number;
  // Hits since the chill was last renewed, so only the newest wears it off
  hit: number;
}

// Black Ice's bolts (see BlackIce.ts): every hit chills the target 10% more
// for 4 seconds, the 5th freezes it solid for 2, and a bolt that hits a
// frozen enemy deals triple damage
export class BlackIceDamageEvent implements DamageEvent {
  private static readonly chills = new Map<number, Chill>();

  private readonly boltUnitTypeId = FourCC("u02C");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly chillAbilityId = FourCC("A04X");

  // How chilled an enemy is: its stacks, or 5 while frozen
  public static chillOf(u: Unit): number {
    if (StunUtils.getFrozenUnit(u.id) != null) return 5;
    return BlackIceDamageEvent.chills.get(u.id)?.stacks ?? 0;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.boltUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const id = damageInstance.targetUnitId;
    if (StunUtils.getFrozenUnit(id) != null) {
      damageInstance.damage *= 3;
      return;
    }

    const target = Unit.fromHandle(damageInstance.target);
    const chills = BlackIceDamageEvent.chills;
    const chill = chills.get(id) ?? { stacks: 0, hit: 0 };
    chill.stacks++;
    chill.hit++;
    if (chill.stacks >= 5) {
      chills.delete(id);
      StunUtils.freezeUnit(target, 2, false, false, false, false);
      const ice = Effect.createAttachment(
        "Abilities/Spells/Undead/FreezingBreath/FreezingBreathTargetArt.mdl",
        target,
        "origin",
      );
      const thaw = TimerUtils.newTimer();
      thaw.start(2, false, () => {
        TimerUtils.releaseTimer(thaw);
        ice.destroy();
      });
      return;
    }
    chills.set(id, chill);

    const dummy = Unit.create(
      MapPlayer.fromHandle(damageInstance.sourceOwningPlayer),
      this.dummyUnitTypeId,
      target.x,
      target.y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.chillAbilityId);
    dummy.setAbilityLevel(this.chillAbilityId, chill.stacks);
    dummy.issueTargetOrder(OrderId.Slow, target);

    const hit = chill.hit;
    const t = TimerUtils.newTimer();
    t.start(4, false, () => {
      TimerUtils.releaseTimer(t);
      if (chills.get(id)?.hit === hit) chills.delete(id);
    });
  }
}
