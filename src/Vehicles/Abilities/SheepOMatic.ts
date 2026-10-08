import { Trigger, Unit } from "w3ts";
import { Globals } from "../../Utility/Globals";
import { RandomNumberGenerator } from "../../Utility/RandomNumberGenerator";

export class SheepOMatic {
  private readonly sheepOMaticAbilityId = FourCC("A00U");
  private readonly polymorphAbilityId = FourCC("A00T");
  private readonly dummyUnitId = FourCC("u000");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      const siegeEngine = Unit.fromEvent();
      const level = siegeEngine.getAbilityLevel(this.sheepOMaticAbilityId);
      if (level < 1) return;
      if (RandomNumberGenerator.random(1, 100) > 25) return;

      const attacker = Unit.fromHandle(GetAttacker());
      const dummy = Unit.create(
        siegeEngine.owner,
        this.dummyUnitId,
        attacker.x,
        attacker.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.polymorphAbilityId);
      dummy.setAbilityLevel(this.polymorphAbilityId, level);
      dummy.issueTargetOrder("polymorph", attacker);
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_ATTACKED);
  }
}
