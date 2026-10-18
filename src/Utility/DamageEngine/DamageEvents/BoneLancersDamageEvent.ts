import { MapPlayer, Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";

// Every third blow of a Bone Lancer (see BoneLancers.ts) drives spikes
// through its target and on behind it
export class BoneLancersDamageEvent implements DamageEvent {
  private readonly lancerUnitTypeId = FourCC("u028");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly impaleAbilityId = FourCC("A00A");
  // Blows struck, by lancer handle id
  private readonly blows = new Map<number, number>();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.sourceUnitTypeId !== this.lancerUnitTypeId) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const lancer = Unit.fromHandle(damageInstance.source);
    if (!lancer.isAlive()) {
      this.blows.delete(damageInstance.sourceUnitId);
      return;
    }
    const blows = (this.blows.get(damageInstance.sourceUnitId) ?? 0) + 1;
    if (blows < 3) {
      this.blows.set(damageInstance.sourceUnitId, blows);
      return;
    }
    this.blows.delete(damageInstance.sourceUnitId);

    // The spikes start at the lancer and run on through its target
    const target = Unit.fromHandle(damageInstance.target);
    const dummy = Unit.create(
      MapPlayer.fromHandle(damageInstance.sourceOwningPlayer),
      this.dummyUnitTypeId,
      lancer.x,
      lancer.y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    dummy.addAbility(this.impaleAbilityId);
    dummy.issueOrderAt("impale", target.x, target.y);
  }
}
