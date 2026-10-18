import { Effect, MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { TimerUtils } from "../../TimerUtils";

interface Prey {
  unit: Unit;
  owner: MapPlayer;
  left: number;
}

// Carrion Feast's bats (see CarrionFeast.ts) cripple every enemy they hit for
// 3 seconds, and devour it the moment it drops below 30% of its life
export class CarrionFeastDamageEvent implements DamageEvent {
  private readonly casterUnitTypeId = FourCC("u02E");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly crippleAbilityId = FourCC("A03P");
  // By handle id
  private readonly prey = new Map<number, Prey>();
  private feeding = false;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.casterUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const target = Unit.fromHandle(damageInstance.target);
    if (!target.isAlive()) return;
    const owner = MapPlayer.fromHandle(damageInstance.sourceOwningPlayer);
    if (!this.prey.has(damageInstance.targetUnitId)) {
      const dummy = Unit.create(
        owner,
        this.dummyUnitTypeId,
        target.x,
        target.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, target);
      dummy.damageTarget(
        target.handle,
        120,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    }

    this.prey.set(damageInstance.targetUnitId, {
      unit: target,
      owner,
      left: 3,
    });
    this.startFeeding();
  }

  private startFeeding(): void {
    if (this.feeding) return;
    this.feeding = true;

    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      for (const [id, prey] of this.prey) {
        const { unit } = prey;
        prey.left -= 0.1;
        if (!unit.isAlive() || prey.left <= 0) {
          this.prey.delete(id);
          continue;
        }
        if (unit.life >= 0.3 * unit.maxLife) continue;

        this.prey.delete(id);
        Effect.createAttachment(
          "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmDamage.mdl",
          unit,
          "chest",
        ).destroy();
        const dummy = Unit.create(
          prey.owner,
          this.dummyUnitTypeId,
          unit.x,
          unit.y,
        );
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.damageTarget(
          unit.handle,
          unit.life + 1,
          false,
          false,
          ATTACK_TYPE_CHAOS,
          DAMAGE_TYPE_UNIVERSAL,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
      if (this.prey.size > 0) return;

      TimerUtils.releaseTimer(t);
      this.feeding = false;
    });
  }
}
