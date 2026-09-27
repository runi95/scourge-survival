import { Trigger, Unit } from "w3ts";
import { Globals } from "../../Utility/Globals";
import { TimerUtils } from "../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../Utility/RandomNumberGenerator";

export class ArtilleryStrike {
  private readonly artilleryStrikeAbilityId: number = FourCC("A00F");
  private readonly dummyUnitId: number = FourCC("u00S");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.artilleryStrikeAbilityId) return;

      const caster = Unit.fromEvent();
      const { owner, x, y } = caster;
      const targetX = GetSpellTargetX();
      const targetY = GetSpellTargetY();

      let ticks = 20;
      const t = TimerUtils.newTimer();
      t.start(0.08, true, () => {
        if (ticks <= 0) {
          TimerUtils.releaseTimer(t);
          return;
        }

        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.issueOrderAt(
          851984,
          targetX + RandomNumberGenerator.random(-300, 300),
          targetY + RandomNumberGenerator.random(-300, 300),
        );

        ticks--;
      });
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }
}
