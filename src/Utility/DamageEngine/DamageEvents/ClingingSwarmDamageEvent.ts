import { Effect, MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { TimerUtils } from "../../TimerUtils";

interface Latch {
  unit: Unit;
  owner: MapPlayer;
  bat: Effect;
  left: number;
}

// Clinging Swarm's bats (see ClingingSwarm.ts): one latches onto every enemy
// the swarm hits, crippling it and gnawing at it twice a second for 6
// seconds. A bat that is already on it starts over
export class ClingingSwarmDamageEvent implements DamageEvent {
  private readonly casterUnitTypeId = FourCC("u02E");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly crippleAbilityId = FourCC("A03P");
  // By handle id
  private readonly latches = new Map<number, Latch>();
  private gnawing = false;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.casterUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const target = Unit.fromHandle(damageInstance.target);
    if (!target.isAlive()) return;
    const owner = MapPlayer.fromHandle(damageInstance.sourceOwningPlayer);
    const dummy = Unit.create(owner, this.dummyUnitTypeId, target.x, target.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.crippleAbilityId);
    dummy.issueTargetOrder(OrderId.Cripple, target);

    const latch = this.latches.get(damageInstance.targetUnitId);
    if (latch != null) {
      latch.left = 6;
      return;
    }
    const bat = Effect.createAttachment(
      "Doodads/Northrend/Props/Bats/Bats.mdl",
      target,
      "overhead",
    );
    bat.scale = 0.4;
    this.latches.set(damageInstance.targetUnitId, {
      unit: target,
      owner,
      bat,
      left: 6,
    });
    this.startGnawing();
  }

  private startGnawing(): void {
    if (this.gnawing) return;
    this.gnawing = true;

    const t = TimerUtils.newTimer();
    t.start(0.5, true, () => {
      for (const [id, latch] of this.latches) {
        const { unit } = latch;
        latch.left -= 0.5;
        if (!unit.isAlive() || latch.left < 0) {
          latch.bat.destroy();
          this.latches.delete(id);
          continue;
        }

        const dummy = Unit.create(
          latch.owner,
          this.dummyUnitTypeId,
          unit.x,
          unit.y,
        );
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.damageTarget(
          unit.handle,
          14,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
      if (this.latches.size > 0) return;

      TimerUtils.releaseTimer(t);
      this.gnawing = false;
    });
  }
}
