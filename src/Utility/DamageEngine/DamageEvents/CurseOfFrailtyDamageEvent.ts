import { MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { TimerUtils } from "../../TimerUtils";

// Cripples every enemy that hits a hero holding Curse of Frailty (see CurseOfFrailty.ts)
export class CurseOfFrailtyDamageEvent implements DamageEvent {
  // Curse of Frailty items held, by player id
  public static readonly HOLDERS = new Map<number, number>();

  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly crippleAbilityId = FourCC("A03P");
  // Attackers cursed in the last 3 seconds, by handle id
  private readonly cursed = new Set<number>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;
    if (
      !CurseOfFrailtyDamageEvent.HOLDERS.has(
        damageInstance.targetOwningPlayerId,
      )
    )
      return;
    if (this.cursed.has(damageInstance.sourceUnitId)) return;

    const vehicle =
      GameMap.PLAYER_VEHICLES[damageInstance.targetOwningPlayerId];
    if (vehicle?.unit == null) return;
    if (vehicle.unit.handle !== damageInstance.target) return;

    const attackerId = damageInstance.sourceUnitId;
    this.cursed.add(attackerId);
    const t = TimerUtils.newTimer();
    t.start(3, false, () => {
      TimerUtils.releaseTimer(t);
      this.cursed.delete(attackerId);
    });

    const attacker = Unit.fromHandle(damageInstance.source);
    const dummy = Unit.create(
      MapPlayer.fromHandle(damageInstance.targetOwningPlayer),
      this.dummyUnitTypeId,
      vehicle.unit.x,
      vehicle.unit.y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.crippleAbilityId);
    dummy.issueTargetOrder(OrderId.Cripple, attacker);
    dummy.damageTarget(
      attacker.handle,
      150,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
  }
}
