import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class ShadowBoltDamageEvent implements DamageEvent {
  private readonly shadowBoltUnitTypeId = FourCC("u01Q");
  // Necromancer Academy's Necromancers fire shadow bolts too
  private readonly academyNecromancerUnitTypeId = FourCC("u01Y");
  private readonly curseAbilityId = FourCC("A016");
  private readonly maxLevel = 10;
  private readonly damagePerLevel = 0.1;

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (
      damageInstance.sourceUnitTypeId !== this.shadowBoltUnitTypeId &&
      damageInstance.sourceUnitTypeId !== this.academyNecromancerUnitTypeId
    )
      return;

    const target = damageInstance.target;
    const level = GetUnitAbilityLevel(target, this.curseAbilityId);
    damageInstance.damage *= 1 + this.damagePerLevel * level;

    if (level === 0) UnitAddAbility(target, this.curseAbilityId);
    else if (level < this.maxLevel)
      SetUnitAbilityLevel(target, this.curseAbilityId, level + 1);
  }
}
