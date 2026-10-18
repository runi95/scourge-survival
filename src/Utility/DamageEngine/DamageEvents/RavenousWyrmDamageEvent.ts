import { MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";

// A Ravenous Wyrm's breath (see RavenousWyrm.ts) cripples every enemy it
// hits that is not crippled yet
export class RavenousWyrmDamageEvent implements DamageEvent {
  private readonly wyrmUnitTypeId = FourCC("u02D");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly crippleAbilityId = FourCC("A03P");
  private readonly crippleBuffId = FourCC("Bcri");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== this.wyrmUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const target = Unit.fromHandle(damageInstance.target);
    if (!target.isAlive()) return;
    if (target.getAbilityLevel(this.crippleBuffId) > 0) return;

    const dummy = Unit.create(
      MapPlayer.fromHandle(damageInstance.sourceOwningPlayer),
      this.dummyUnitTypeId,
      target.x,
      target.y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.crippleAbilityId);
    dummy.issueTargetOrder(OrderId.Cripple, target);
    dummy.damageTarget(
      target.handle,
      100,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
  }
}
