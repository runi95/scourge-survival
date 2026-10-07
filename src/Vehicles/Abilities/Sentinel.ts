import { Trigger, Unit } from "w3ts";
import { Globals } from "../../Utility/Globals";
import { TimerUtils } from "../../Utility/TimerUtils";

export class Sentinel {
  private readonly sentinelAbilityId: number = FourCC("A00R");
  private readonly level1DummyUnitId: number = FourCC("u01D");
  private readonly level2DummyUnitId: number = FourCC("u01E");
  private readonly level3DummyUnitId: number = FourCC("u01F");
  private readonly level4DummyUnitId: number = FourCC("u01G");
  private readonly level5DummyUnitId: number = FourCC("u01H");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.sentinelAbilityId) return;

      const caster = Unit.fromEvent();
      const level = caster.getAbilityLevel(this.sentinelAbilityId);
      const targetX = GetSpellTargetX();
      const targetY = GetSpellTargetY();

      let dummyUnitId = this.level1DummyUnitId;
      if (level === 2) {
        dummyUnitId = this.level2DummyUnitId;
      } else if (level === 3) {
        dummyUnitId = this.level3DummyUnitId;
      } else if (level === 4) {
        dummyUnitId = this.level4DummyUnitId;
      } else if (level === 5) {
        dummyUnitId = this.level5DummyUnitId;
      }

      const t = TimerUtils.newTimer();
      t.start(1, false, () => {
        TimerUtils.releaseTimer(t);

        const dummy = Unit.create(caster.owner, dummyUnitId, targetX, targetY);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      });
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }
}
