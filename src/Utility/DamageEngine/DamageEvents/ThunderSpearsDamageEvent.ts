import { MapPlayer, Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";

export class ThunderSpearsDamageEvent implements DamageEvent {
  private readonly thunderSpearUnitTypeId = FourCC("u015");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly chainLightningAbilityId = FourCC("A03A");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.thunderSpearUnitTypeId) return;

    const target = Unit.fromHandle(damageInstance.target);
    const dummy = Unit.create(
      MapPlayer.fromHandle(damageInstance.sourceOwningPlayer),
      this.dummyUnitTypeId,
      target.x,
      target.y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    dummy.addAbility(this.chainLightningAbilityId);
    dummy.issueTargetOrder("chainlightning", target);
  }
}
