import { Effect, Timer, Unit } from "w3ts";
import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { TimerUtils } from "../../TimerUtils";

const BURN_DAMAGE = 15;
const BURN_TICKS = 3;

interface Burn {
  target: unit;
  playerId: number;
  ticksLeft: number;
  effect: Effect;
}

export class FireboltDamageEvent implements DamageEvent {
  private readonly fireboltDummyUnitTypeId = FourCC("u00Q");
  private readonly burns = new Map<number, Burn>();
  private timer: Timer | null = null;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.fireboltDummyUnitTypeId)
      return;

    // Refresh the burn instead of stacking it
    const burn = this.burns.get(damageInstance.targetUnitId);
    if (burn != null) {
      burn.ticksLeft = BURN_TICKS;
      burn.playerId = damageInstance.sourceOwningPlayerId;
      return;
    }

    this.burns.set(damageInstance.targetUnitId, {
      target: damageInstance.target,
      playerId: damageInstance.sourceOwningPlayerId,
      ticksLeft: BURN_TICKS,
      effect: Effect.createAttachment(
        "Abilities/Spells/Other/BreathOfFire/BreathOfFireDamage.mdl",
        Unit.fromHandle(damageInstance.target),
        "chest",
      ),
    });

    if (this.timer == null) {
      this.timer = TimerUtils.newTimer();
      this.timer.start(1, true, () => this.tick());
    }
  }

  private tick(): void {
    const finished: number[] = [];
    this.burns.forEach((burn, targetUnitId) => {
      const source = GameMap.PLAYER_VEHICLES[burn.playerId].unit;
      if (source != null && UnitAlive(burn.target)) {
        source.damageTarget(
          burn.target,
          BURN_DAMAGE,
          false,
          false,
          ATTACK_TYPE_MAGIC,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        burn.ticksLeft--;
      } else {
        burn.ticksLeft = 0;
      }

      if (burn.ticksLeft <= 0) finished.push(targetUnitId);
    });

    for (const targetUnitId of finished) {
      this.burns.get(targetUnitId).effect.destroy();
      this.burns.delete(targetUnitId);
    }

    if (this.burns.size === 0) {
      TimerUtils.releaseTimer(this.timer);
      this.timer = null;
    }
  }
}
