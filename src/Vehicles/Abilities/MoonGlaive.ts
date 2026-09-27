import { Trigger, Unit } from "w3ts";

export class MoonGlaive {
  private readonly moonGlaiveAbilityId = FourCC("A02O");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetLearnedSkill() !== this.moonGlaiveAbilityId) return;

      const hero = Unit.fromEvent();
      BlzSetUnitWeaponIntegerField(
        hero.handle,
        UNIT_WEAPON_IF_ATTACK_MAXIMUM_NUMBER_OF_TARGETS,
        0,
        1 + GetLearnedSkillLevel(),
      );
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_HERO_SKILL);
  }
}
