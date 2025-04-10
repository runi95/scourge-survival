import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

export class Phoenix extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I01E");
  public readonly merchantItemTypeId = FourCC("I01F");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I00V")];

  private readonly timers = new Map<number, Timer>();
  private readonly phoenixUnitTypeId: number = FourCC("h005");
  private readonly playerPhoenix = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    this.itemIterations.set(itemId, 0);
    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations === 0) {
        const { x, y } = vehicle.unit;
        const phoenix = Unit.create(
          owner,
          this.phoenixUnitTypeId,
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250)
        );
        phoenix.issueTargetOrder("patrol", vehicle.unit);
        this.playerPhoenix.set(itemId, phoenix);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 23) {
        const phoenix = this.playerPhoenix.get(itemId);
        if (phoenix == null) return;

        this.playerPhoenix.delete(itemId);
        phoenix.kill();

        return;
      } else if (iterations >= 29) {
        this.itemIterations.set(itemId, 0);
      } else if (iterations > 23) {
        return;
      }

      const { x, y } = vehicle.unit;
      const phoenix = this.playerPhoenix.get(itemId);
      if (phoenix == null) return;
      const dist = Math.sqrt(
        Math.pow(phoenix.x - x, 2) + Math.pow(phoenix.y - y, 2)
      );
      if (dist < 1000) {
        phoenix.issueOrderAt(
          "attack",
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250)
        );
      } else {
        phoenix.issueOrderAt(
          "move",
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250)
        );
      }
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
    this.itemIterations.delete(itemId);

    const phoenix = this.playerPhoenix.get(itemId);
    if (phoenix == null) return;
    phoenix.kill();
  }
}
