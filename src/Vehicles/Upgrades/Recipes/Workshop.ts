import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class Workshop extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I01H");
  public readonly merchantItemTypeId = FourCC("I01G");
  public readonly recipe: number[] = [FourCC("I000"), FourCC("I00O")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly pocketFactoryAbilityId: number = FourCC("A01D");
  private readonly itemIterations = new Map<number, number>();
  private readonly itemCounters = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    const existingIterations = this.itemIterations.get(itemId);
    if (existingIterations == null) {
      this.itemIterations.set(itemId, 30);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        2 * existingIterations
      );
    }

    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 29) {
        this.itemIterations.set(itemId, iterations + 1);
        return;
      }

      this.itemCounters.set(itemId, 0);
      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.pocketFactoryAbilityId);

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      dummy.issueOrderAt(
        "summonfactory",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians)
      );
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
    // this.itemIterations.delete(itemId);
    this.itemCounters.delete(itemId);
  }
}
