import { Trigger, Unit } from "w3ts";
import { Globals } from "../../Utility/Globals";
import { OrderId } from "../../../node_modules/w3ts/globals/order";

export class UnholyFrenzy {
  private readonly unholyFrenzyTrig: Trigger;
  private readonly unholyFrenzyTrigAbilityId = FourCC("A019");
  private readonly unholyFrenzyAbilityId = FourCC("A01S");

  private readonly dummyUnitId: number = FourCC("u000");

  constructor() {
    this.unholyFrenzyTrig = Trigger.create();
    this.unholyFrenzyTrig.addAction(() => {
      const ability = GetSpellAbilityId();
      if (ability !== this.unholyFrenzyTrigAbilityId) return;

      const triggeringUnit = Unit.fromEvent();
      const { owner } = triggeringUnit;
      const dummy = CreateUnit(
        owner.handle,
        this.dummyUnitId,
        triggeringUnit.x,
        triggeringUnit.y,
        0
      );
      UnitApplyTimedLife(dummy, Globals.TIMED_LIFE_BUFF_ID, 3);
      UnitAddAbility(dummy, this.unholyFrenzyAbilityId);
      IssueTargetOrderById(dummy, OrderId.Unholyfrenzy, triggeringUnit.handle);
    });

    this.unholyFrenzyTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_CAST);
  }
}
