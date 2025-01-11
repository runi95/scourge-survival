import { MapPlayer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../Vehicle";
import { Globals } from "../../Utility/Globals";
import { RandomNumberGenerator } from "../../Utility/RandomNumberGenerator";
import { GameMap } from "../../Game/GameMap";

const MULT = Math.PI / 180;

export class PocketFactory {
  private readonly gameMap: GameMap;
  private readonly trigger = Trigger.create();

  private readonly pocketFactoryItemTypeId = FourCC("I00O");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly pocketFactoryAbilityId: number = FourCC("A01C");

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.trigger.addAction(() => {
      const item = GetManipulatedItem();
      if (GetItemTypeId(item) !== this.pocketFactoryItemTypeId) return;

      const unit = Unit.fromEvent();
      const owner = unit.owner;
      const ownerId = owner.id;
      const vehicle = this.gameMap.playerVehicles[ownerId];
      if (vehicle == null) return;

      this.createFactory(vehicle, owner);
    });
    this.trigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_USE_ITEM);
  }

  private createFactory(vehicle: Vehicle, owner: MapPlayer) {
    const pocketFactoryLevel = vehicle.upgradeMap.get("Pocket Factory");
    const { x, y } = vehicle.unit;

    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.pocketFactoryAbilityId);
    if (pocketFactoryLevel > 1) {
      dummy.setAbilityLevel(this.pocketFactoryAbilityId, pocketFactoryLevel);
    }

    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    dummy.issueOrderAt(
      "summonfactory",
      x + 400 * Math.cos(radians),
      y + 400 * Math.sin(radians)
    );
  }
}
