import { MapPlayer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { GameMap } from "../../Game/GameMap";
import { Globals } from "../../Utility/Globals";
import { TimerUtils } from "../../Utility/TimerUtils";

export class FaerieFire {
  private readonly faerieFireTrig: Trigger;
  private readonly faerieFireAbilityId = FourCC("A03M");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly locustAbilityId: number = FourCC("Aloc");

  constructor() {
    const map = CreateRegion();
    RegionAddRect(map, GetPlayableMapRect());

    this.faerieFireTrig = Trigger.create();
    this.faerieFireTrig.addAction(() => {
      const creep = Unit.fromEvent();
      const creepPlayerId = creep.owner.id;
      if (creepPlayerId < 9 || creepPlayerId > 17) return;
      if (creep.getAbilityLevel(this.locustAbilityId) > 0) return;

      const vehicle = GameMap.PLAYER_VEHICLES[creepPlayerId - 9];
      if (vehicle.unit == null) return;

      const faerieFireLevel = vehicle.upgradeMap.get("Faerie Fire");
      if (faerieFireLevel == null) return;
      if (faerieFireLevel < 1) return;

      // The dummy can only target what its owner sees, and creeps spawn in the fog
      const player = MapPlayer.fromIndex(creepPlayerId - 9);
      creep.shareVision(player, true);
      const dummy = Unit.create(player, this.dummyUnitId, creep.x, creep.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.faerieFireAbilityId);
      dummy.issueTargetOrder(OrderId.Faeriefire, creep);

      const t = TimerUtils.newTimer();
      t.start(1, false, () => {
        TimerUtils.releaseTimer(t);
        creep.shareVision(player, false);
      });
    });
    this.faerieFireTrig.registerEnterRegion(map, undefined);
  }
}
