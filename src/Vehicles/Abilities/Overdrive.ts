import { Effect, Trigger, Unit } from "w3ts";
import { OverdriveDamageEvent } from "../../Utility/DamageEngine/DamageEvents/OverdriveDamageEvent";
import { TimerUtils } from "../../Utility/TimerUtils";

export class Overdrive {
  private readonly overdriveAbilityId: number = FourCC("A02I");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.overdriveAbilityId) return;

      const caster = Unit.fromEvent();
      const playerId = caster.owner.id;
      const level = caster.getAbilityLevel(this.overdriveAbilityId);
      OverdriveDamageEvent.ACTIVE[playerId] = true;
      const glow = Effect.createAttachment(
        "Abilities/Spells/Orc/Bloodlust/BloodlustTarget.mdl",
        caster,
        "origin",
      );

      const t = TimerUtils.newTimer();
      t.start(3 + level, false, () => {
        OverdriveDamageEvent.ACTIVE[playerId] = false;
        glow.destroy();

        const slow = caster.moveSpeed * 0.5;
        caster.moveSpeed = caster.moveSpeed - slow;
        const smoke = Effect.createAttachment(
          "Environment/SmallBuildingFire/SmallBuildingFire2.mdl",
          caster,
          "origin",
        );
        t.start(3, false, () => {
          caster.moveSpeed = caster.moveSpeed + slow;
          smoke.destroy();
          TimerUtils.releaseTimer(t);
        });
      });
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }
}
