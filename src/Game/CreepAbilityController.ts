import { MapPlayer, Trigger } from "w3ts";
import { OrderId } from "w3ts/globals";
import { CREEP_TYPE, GameMap } from "./GameMap";
import { Globals } from "../Utility/Globals";

export class CreepAbilityController {
  private readonly gameMap: GameMap;
  private readonly attackTrigger = Trigger.create();
  private readonly stopTrigger = Trigger.create();
  private readonly spellCastTrigger = Trigger.create();

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleBuffId = FourCC("Bcri");
  private readonly crippleAbilityId = FourCC("A00C");
  private readonly blizzardUnitTypeId = FourCC("u00B");

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public initialize() {
    this.attackTrigger.addAction(() => {
      const attacker = GetAttacker();
      const unitTypeId = GetUnitTypeId(attacker);

      switch (unitTypeId) {
        case CREEP_TYPE.NECROMANCER:
          (() => {
            const mana = GetUnitState(attacker, UNIT_STATE_MANA);
            if (mana < 30) return;

            const triggerUnit = GetTriggerUnit();
            if (!UnitHasBuffBJ(triggerUnit, this.crippleBuffId)) {
              SetUnitState(attacker, UNIT_STATE_MANA, mana - 30);

              const dummy = CreateUnit(
                GetOwningPlayer(attacker),
                this.dummyUnitId,
                GetUnitX(attacker),
                GetUnitY(attacker),
                0
              );
              UnitApplyTimedLife(dummy, Globals.TIMED_LIFE_BUFF_ID, 1);
              UnitAddAbility(dummy, this.crippleAbilityId);
              IssueTargetOrderById(dummy, OrderId.Cripple, triggerUnit);
            }
          })();
          break;
        case CREEP_TYPE.FROST_WYRM:
          (() => {
            const mana = GetUnitState(attacker, UNIT_STATE_MANA);
            if (mana < 75) return;

            SetUnitState(attacker, UNIT_STATE_MANA, mana - 75);
            const triggerUnit = GetTriggerUnit();
            const x = GetUnitX(triggerUnit);
            const y = GetUnitY(triggerUnit);
            const blizzardDummy = CreateUnit(
              Player(26),
              this.blizzardUnitTypeId,
              x,
              y,
              0
            );
            UnitApplyTimedLife(blizzardDummy, Globals.TIMED_LIFE_BUFF_ID, 1.5);
          })();
          break;
      }
    });

    this.stopTrigger.addAction(() => {
      const issuedOrderId = GetIssuedOrderId();
      switch (issuedOrderId) {
        case OrderId.Stop:
        case OrderId.Holdposition:
          break;
        default:
          return;
      }

      const triggerUnit = GetTriggerUnit();
      const unitTypeId = GetUnitTypeId(triggerUnit);
      if (unitTypeId === this.dummyUnitId) return;

      const owner = GetOwningPlayer(triggerUnit);
      const ownerId = GetPlayerId(owner);
      IssueTargetOrder(
        triggerUnit,
        "attack",
        this.gameMap.playerVehicles[ownerId - 9].unit.handle
      );
    });

    this.spellCastTrigger.addAction(() => {
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
      const creepPlayer = MapPlayer.fromIndex(
        GameMap.ONLINE_PLAYER_ID_LIST[i] + 9
      );
      this.stopTrigger.registerPlayerUnitEvent(
        creepPlayer,
        EVENT_PLAYER_UNIT_ISSUED_ORDER,
        undefined
      );
      this.stopTrigger.registerPlayerUnitEvent(
        creepPlayer,
        EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER,
        undefined
      );
      this.stopTrigger.registerPlayerUnitEvent(
        creepPlayer,
        EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER,
        undefined
      );
      this.spellCastTrigger.registerPlayerUnitEvent(
        creepPlayer,
        EVENT_PLAYER_UNIT_SPELL_FINISH,
        undefined
      );
    }
  }
}
