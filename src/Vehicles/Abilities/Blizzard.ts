import { MapPlayer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals";
import { Globals } from "../../Utility/Globals";

export class Blizzard {
  private readonly blizzardTrig: Trigger;

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly blizzardAbilityId = FourCC("A010");
  private readonly blizzardUnitTypeId = FourCC("u00B");

  constructor() {
    this.blizzardTrig = Trigger.create();
    this.blizzardTrig.addAction(() => {
      const dyingUnit = Unit.fromEvent();
      const unitTypeId = dyingUnit.typeId;
      if (unitTypeId !== this.blizzardUnitTypeId) return;

      const { x, y } = dyingUnit;
      const dummy = CreateUnit(Player(26), this.dummyUnitId, x, y, 0);
      UnitApplyTimedLife(dummy, Globals.TIMED_LIFE_BUFF_ID, 3);
      UnitAddAbility(dummy, this.blizzardAbilityId);
      IssuePointOrderById(dummy, OrderId.Blizzard, x, y);
    });

    this.blizzardTrig.registerPlayerUnitEvent(
      MapPlayer.fromIndex(26),
      EVENT_PLAYER_UNIT_DEATH,
      undefined
    );
  }
}
