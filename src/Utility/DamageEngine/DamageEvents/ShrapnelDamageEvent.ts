import { MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { TimerUtils } from "../../TimerUtils";

interface Lodged {
  unit: Unit;
  owner: MapPlayer;
  x: number;
  y: number;
  left: number;
}

// Shrapnel's rockets (see Shrapnel.ts) lodge shrapnel in every enemy they hit
// for 5 seconds: it is crippled, and every step it takes tears at it
export class ShrapnelDamageEvent implements DamageEvent {
  private readonly casterUnitTypeId = FourCC("u029");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly crippleAbilityId = FourCC("A03P");
  private readonly crippleBuffId = FourCC("Bcri");
  private readonly damagePerDistance = 0.35;
  // By handle id
  private readonly lodged = new Map<number, Lodged>();
  private tearing = false;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.casterUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const target = Unit.fromHandle(damageInstance.target);
    if (!target.isAlive()) return;
    const owner = MapPlayer.fromHandle(damageInstance.sourceOwningPlayer);
    const lodged = this.lodged.get(damageInstance.targetUnitId);
    if (lodged != null) {
      lodged.left = 5;
    } else {
      const { x, y } = target;
      this.lodged.set(damageInstance.targetUnitId, {
        unit: target,
        owner,
        x,
        y,
        left: 5,
      });
    }

    if (target.getAbilityLevel(this.crippleBuffId) === 0) {
      const dummy = Unit.create(
        owner,
        this.dummyUnitTypeId,
        target.x,
        target.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, target);
    }
    this.startTearing();
  }

  private startTearing(): void {
    if (this.tearing) return;
    this.tearing = true;

    const t = TimerUtils.newTimer();
    t.start(0.25, true, () => {
      for (const [id, lodged] of this.lodged) {
        const { unit } = lodged;
        lodged.left -= 0.25;
        if (!unit.isAlive() || lodged.left <= 0) {
          this.lodged.delete(id);
          continue;
        }

        const { x, y } = unit;
        const walked = Math.sqrt(
          (x - lodged.x) * (x - lodged.x) + (y - lodged.y) * (y - lodged.y),
        );
        lodged.x = x;
        lodged.y = y;
        // Blinks and pulls are not steps
        if (walked < 1 || walked > 200) continue;

        const dummy = Unit.create(lodged.owner, this.dummyUnitTypeId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.damageTarget(
          unit.handle,
          this.damagePerDistance * walked,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
      if (this.lodged.size > 0) return;

      TimerUtils.releaseTimer(t);
      this.tearing = false;
    });
  }
}
