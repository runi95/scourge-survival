import { Trigger } from "../../node_modules/w3ts/index";
import { Log } from "../lib/Serilog/Serilog";
import { GameOptions } from "./GameOptions";

export class Debugger {
  constructor(gameOptions: GameOptions) {
    if (!gameOptions.isDebugModeEnabled) return;

    const attackTrigger = Trigger.create();
    attackTrigger.addAction(() => {
      const attacker = GetAttacker();
      const attacked = GetTriggerUnit();
      Log.Debug(
        `${GetUnitName(attacker)}(${GetHandleId(
          attacker
        )}) attacked ${GetUnitName(attacked)}(${GetHandleId(attacked)})`
      );
    });
    attackTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_ATTACKED);

    const issuedOrderTrigger = Trigger.create();
    issuedOrderTrigger.addAction(() => {
      const order = GetIssuedOrderId();
      // Ignore "move", "stop", "smart" and unknown
      if (
        order === 851986 ||
        order === 851972 ||
        order === 851971 ||
        order === 851974
      )
        return;

      const ordered = GetOrderedUnit();
      Log.Debug(
        `${GetUnitName(ordered)}(${GetHandleId(
          ordered
        )}) was ordered to ${OrderId2String(order)}(${order})`
      );
    });
    issuedOrderTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_ISSUED_ORDER);
    issuedOrderTrigger.registerAnyUnitEvent(
      EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER
    );
    issuedOrderTrigger.registerAnyUnitEvent(
      EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER
    );
    issuedOrderTrigger.registerAnyUnitEvent(
      EVENT_PLAYER_UNIT_ISSUED_UNIT_ORDER
    );

    const acquiredTargetTrigger = Trigger.create();
    acquiredTargetTrigger.addAction(() => {
      const trigger = GetTriggerUnit();
      const target = GetEventTargetUnit();
      Log.Debug(
        `${GetUnitName(trigger)}(${GetHandleId(
          trigger
        )}) has acquired target ${GetUnitName(target)}(${GetHandleId(target)})`
      );
    });
  }
}
