import { Effect, MapPlayer, Unit } from "w3ts";
import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { OrderId } from "../../../../node_modules/w3ts/globals/order";

export class UnholyAuraDamageEvent implements DamageEvent {
  private readonly gameMap: GameMap;
  private readonly unholyAuraBuffId = FourCC("B003");
  private readonly skeletonUnitTypeId = FourCC("u00C");

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (
      GetUnitAbilityLevel(damageInstance.target, this.unholyAuraBuffId) === 0
    ) {
      return;
    }

    const vehicle =
      this.gameMap.playerVehicles[damageInstance.targetOwningPlayerId - 9];
    if (vehicle == null) return;

    const x = GetUnitX(damageInstance.target);
    const y = GetUnitY(damageInstance.target);
    Effect.create(
      "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
      x,
      y
    );

    const unit = Unit.create(
      MapPlayer.fromHandle(damageInstance.targetOwningPlayer),
      this.skeletonUnitTypeId,
      x,
      y
    );
    unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
    unit.issueTargetOrder(OrderId.Attack, vehicle.unit);
  }
}
