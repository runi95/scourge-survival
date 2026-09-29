import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

export class CallToArms extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I02P");
  public readonly merchantItemTypeId = FourCC("I02Q");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I00O")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly callToArmsAbilityTypeId: number = FourCC("A00O");
  private readonly itemCallToArmsMap = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    const currentIterations = this.itemIterations.get(itemId);
    if (currentIterations == null) {
      this.itemIterations.set(itemId, 30);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown - 2 * currentIterations,
      );
    }

    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations < 30) {
        this.itemIterations.set(itemId, iterations + 1);
        return;
      }

      const { x, y } = vehicle.unit;
      const dummyUnit = Unit.create(owner, this.dummyUnitTypeId, x, y);
      this.itemCallToArmsMap.delete(itemId);
      this.itemCallToArmsMap.set(itemId, dummyUnit);
      dummyUnit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 31);
      dummyUnit.addAbility(this.callToArmsAbilityTypeId);
      dummyUnit.issueImmediateOrder("Locustswarm");

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.itemIterations.set(itemId, 0);
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
    this.itemCallToArmsMap.delete(itemId);
  }
}
