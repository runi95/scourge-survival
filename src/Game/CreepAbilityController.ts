import { MapPlayer, Trigger } from "w3ts";
import { OrderId } from "w3ts/globals";
import { CREEP_TYPE, GameMap } from "./GameMap";

export class CreepAbilityController {
  private readonly gameMap: GameMap;
  private readonly attackTrigger = Trigger.create();
  private readonly stopTrigger = Trigger.create();

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public initialize() {
    this.attackTrigger.addAction(() => {
      const attacker = GetAttacker();
      const unitTypeId = GetUnitTypeId(attacker);

      switch (unitTypeId) {
        case CREEP_TYPE.NECROMANCER:
          IssueTargetOrder(attacker, "cripple", GetTriggerUnit());
          break;
      }
    });

    this.stopTrigger.addAction(() => {
      const issuedOrderId = GetIssuedOrderId();
      if (issuedOrderId !== OrderId.Stop) return;

      const triggerUnit = GetTriggerUnit();
      const owner = GetOwningPlayer(triggerUnit);
      const ownerId = GetPlayerId(owner);
      IssueTargetOrder(
        triggerUnit,
        "attack",
        this.gameMap.playerVehicles[ownerId - 9].unit.handle
      );
    });

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      this.attackTrigger.registerUnitEvent(
        this.gameMap.playerVehicles[GameMap.ONLINE_PLAYER_ID_LIST[i]].unit,
        EVENT_UNIT_ATTACKED
      );
      this.stopTrigger.registerPlayerUnitEvent(
        MapPlayer.fromIndex(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9),
        EVENT_PLAYER_UNIT_ISSUED_ORDER,
        undefined
      );
    }
  }
}
