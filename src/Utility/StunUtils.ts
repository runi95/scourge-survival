import { StunnedUnit } from "./StunnedUnit";
import { TimerUtils } from "./TimerUtils";
import { FrozenUnit } from "./FrozenUnit";
import { MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import type { Timer } from "w3ts";

const dummyUnitTypeId: number = FourCC("u007");
const timedLifeBuffId: number = FourCC("BTLF");
const permafrostAbilityId: number = FourCC("A00A");
const stunAbilityId: number = FourCC("A003");
const freezeAbilityId: number = FourCC("A009");
export class StunUtils {
  private static readonly STUNNED_UNITS_MAP: Map<number, StunnedUnit> = new Map<
    number,
    StunnedUnit
  >();
  private static readonly FROZEN_UNITS_MAP: Map<number, FrozenUnit> = new Map<
    number,
    FrozenUnit
  >();

  // Static only class
  protected constructor() {}

  /**
   * Stun a unit for a certain amount of time
   *
   * @param u - The unit to stun
   * @param duration - The duration (in seconds) to stun the unit for
   */
  public static stunUnit(u: unit, duration: number): void {
    const handleId: number = GetHandleIdBJ(u);
    if (this.FROZEN_UNITS_MAP.has(handleId)) {
      return;
    } else if (this.STUNNED_UNITS_MAP.has(handleId)) {
      (this.STUNNED_UNITS_MAP.get(handleId) as StunnedUnit).addDuration(
        duration
      );
    } else {
      const stunnedUnit: StunnedUnit = new StunnedUnit(u, duration);
      this.STUNNED_UNITS_MAP.set(handleId, stunnedUnit);
      UnitAddAbility(stunnedUnit.getUnit(), stunAbilityId);
      BlzPauseUnitEx(stunnedUnit.getUnit(), true);
      const t: Timer = TimerUtils.newTimer();
      t.start(0.05, true, () => {
        stunnedUnit.addDuration(-0.05);
        if (stunnedUnit.getDuration() <= 0) {
          UnitRemoveAbility(stunnedUnit.getUnit(), stunAbilityId);
          if (!this.FROZEN_UNITS_MAP.has(handleId)) {
            BlzPauseUnitEx(stunnedUnit.getUnit(), false);
          }

          this.STUNNED_UNITS_MAP.delete(handleId);
          TimerUtils.releaseTimer(t);
        }
      });
    }
  }

  /**
   * Freeze a unit for a certain amount of time.
   * Any frozen unit overrides stun.
   *
   * @param u - The unit to freeze
   * @param duration - The duration (in seconds) to freeze the unit for
   */
  public static freezeUnit(
    u: Unit,
    duration: number,
    permafrost: boolean,
    refreeze: boolean,
    hasIceShards: boolean,
    hasDeepFreeze: boolean
  ): void {
    const handleId: number = u.id;
    if (this.FROZEN_UNITS_MAP.has(handleId)) {
      if (refreeze) {
        const frozenUnit: FrozenUnit = new FrozenUnit(
          u,
          duration,
          permafrost,
          hasIceShards,
          hasDeepFreeze
        );
        if (frozenUnit.getDuration() < duration) {
          frozenUnit.setDuration(duration);
        }
      }

      return;
    }

    if (this.STUNNED_UNITS_MAP.has(handleId)) {
      this.STUNNED_UNITS_MAP.get(handleId)?.setDuration(0);
    }

    const frozenUnit: FrozenUnit = new FrozenUnit(
      u,
      duration,
      permafrost,
      hasIceShards,
      hasDeepFreeze
    );
    this.FROZEN_UNITS_MAP.set(handleId, frozenUnit);
    frozenUnit.getUnit().addAbility(freezeAbilityId);
    frozenUnit.getUnit().pauseEx(true);
    const t: Timer = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      frozenUnit.addDuration(-0.05);
      if (frozenUnit.getDuration() <= 0) {
        if (frozenUnit.permafrost) {
          const dummy: Unit = Unit.create(
            MapPlayer.fromIndex(0),
            dummyUnitTypeId,
            frozenUnit.getUnit().x,
            frozenUnit.getUnit().y,
            bj_UNIT_FACING
          );
          dummy.addAbility(permafrostAbilityId);
          dummy.applyTimedLife(timedLifeBuffId, 1);
          dummy.issueTargetOrder(OrderId.Slow, frozenUnit.getUnit());
        }
        frozenUnit.getUnit().removeAbility(freezeAbilityId);
        frozenUnit.getUnit().pauseEx(false);
        this.FROZEN_UNITS_MAP.delete(handleId);
        TimerUtils.releaseTimer(t);
      }
    });
  }

  public static getFrozenUnit(handleId: number): FrozenUnit | undefined {
    return this.FROZEN_UNITS_MAP.get(handleId);
  }

  public static unfreezeUnit(handleId: number) {
    this.FROZEN_UNITS_MAP.get(handleId)?.setDuration(0);
  }

  public static removeStun(handleId: number) {
    this.STUNNED_UNITS_MAP.get(handleId)?.setDuration(0);
  }

  public static clearAllStuns(): void {
    this.STUNNED_UNITS_MAP.forEach((stunnedUnit: StunnedUnit) =>
      stunnedUnit.setDuration(0)
    );
  }
}
