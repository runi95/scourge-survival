import { Trigger, Unit } from "w3ts";
import { Globals } from "../../Utility/Globals";

export class Stampede {
  private readonly stampedeAbilityId: number = FourCC("A00G");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly stampedeDummyAbilityId: number = FourCC("A00H");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.stampedeAbilityId) return;

      const caster = Unit.fromEvent();
      const { owner, x, y, facing } = caster;
      const level = caster.getAbilityLevel(this.stampedeAbilityId);
      const radians = facing * bj_DEGTORAD;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y, facing);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 7);
      dummy.addAbility(this.stampedeDummyAbilityId);
      dummy.setAbilityLevel(this.stampedeDummyAbilityId, level);
      dummy.issueOrderAt(
        "stampede",
        x + 200 * Math.cos(radians),
        y + 200 * Math.sin(radians),
      );
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }
}
