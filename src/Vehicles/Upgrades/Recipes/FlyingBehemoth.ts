import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

export class FlyingBehemoth extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I01D");
  public readonly merchantItemTypeId = FourCC("I01C");
  public readonly recipe: number[] = [FourCC("I000"), FourCC("I006")];

  private readonly timers = new Map<number, Timer>();
  private readonly flyingMachineUnitTypeId: number = FourCC("h004");
  private readonly playerFlyingBehemoth = new Map<number, Unit>();
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
        const flyingBehemoth = Unit.create(
          owner,
          this.flyingMachineUnitTypeId,
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250)
        );
        flyingBehemoth.issueTargetOrder("patrol", vehicle.unit);
        this.playerFlyingBehemoth.set(itemId, flyingBehemoth);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 23) {
        const flyingBehemoth = this.playerFlyingBehemoth.get(itemId);
        if (flyingBehemoth == null) return;

        this.playerFlyingBehemoth.delete(itemId);
        flyingBehemoth.kill();

        return;
      } else if (iterations >= 29) {
        this.itemIterations.set(itemId, 0);
      } else if (iterations > 23) {
        return;
      }

      const { x, y } = vehicle.unit;
      const flyingBehemoth = this.playerFlyingBehemoth.get(itemId);
      if (flyingBehemoth == null) return;
      const dist = Math.sqrt(
        Math.pow(flyingBehemoth.x - x, 2) + Math.pow(flyingBehemoth.y - y, 2)
      );
      if (dist < 1000) {
        flyingBehemoth.issueOrderAt(
          "attack",
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250)
        );
      } else {
        flyingBehemoth.issueOrderAt(
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

    const flyingBehemoth = this.playerFlyingBehemoth.get(itemId);
    if (flyingBehemoth == null) return;
    flyingBehemoth.kill();
  }
}
