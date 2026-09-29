import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

export class GryphonAviary extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I02T");
  public readonly merchantItemTypeId = FourCC("I02U");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I006")];

  private readonly timers = new Map<number, Timer>();
  private readonly gryphonRiderUnitTypeId: number = FourCC("h00C");
  private readonly itemGryphonRiders = new Map<number, Unit[]>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const { x, y } = vehicle.unit;
    const gryphonRiders: Unit[] = [];
    this.itemGryphonRiders.set(itemId, gryphonRiders);
    for (let i = 0; i < 2; i++) {
      const gryphonRider = Unit.create(
        owner,
        this.gryphonRiderUnitTypeId,
        x + RandomNumberGenerator.random(-250, 250),
        y + RandomNumberGenerator.random(-250, 250),
      );
      gryphonRider.issueTargetOrder("patrol", vehicle.unit);
      gryphonRiders.push(gryphonRider);
    }

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      for (const gryphonRider of gryphonRiders) {
        const dist = Math.sqrt(
          Math.pow(gryphonRider.x - x, 2) + Math.pow(gryphonRider.y - y, 2),
        );
        gryphonRider.issueOrderAt(
          dist < 1000 ? "attack" : "move",
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250),
        );
      }
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);

    const gryphonRiders = this.itemGryphonRiders.get(itemId);
    this.itemGryphonRiders.delete(itemId);
    if (gryphonRiders == null) return;

    for (const gryphonRider of gryphonRiders) {
      gryphonRider.kill();
    }
  }
}
