import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

export class ThunderSpears extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I03Z");
  public readonly merchantItemTypeId = FourCC("I040");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I02L")];

  private readonly timers = new Map<number, Timer>();
  private readonly unitPositions = new Map<number, [number, number]>();
  private readonly itemSpeedMultipliers = new Map<number, number>();
  private readonly itemIterations = new Map<number, number>();
  private readonly dummyUnitId: number = FourCC("u015");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.unitPositions.set(itemId, [vehicle.unit.x, vehicle.unit.y]);
    this.itemSpeedMultipliers.set(itemId, 3);
    this.itemIterations.set(itemId, 0);

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.25, true, () => {
      let itemSpeed = this.itemSpeedMultipliers.get(itemId);
      const iterations = this.itemIterations.get(itemId);

      if (iterations < itemSpeed) {
        this.itemIterations.set(itemId, iterations + 1);
        return;
      }

      this.itemIterations.set(itemId, 0);

      const { x, y } = vehicle.unit;
      const pos = this.unitPositions.get(itemId);
      if (pos[0] === x && pos[1] === y) {
        if (itemSpeed === 3) {
          itemSpeed = 1;
          this.itemSpeedMultipliers.set(itemId, 1);
        } else if (itemSpeed === 1) {
          itemSpeed = 0;
          this.itemSpeedMultipliers.set(itemId, 0);
        }
      } else {
        pos[0] = x;
        pos[1] = y;
        itemSpeed = 3;
        this.itemSpeedMultipliers.set(itemId, 3);
      }

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        0.25 * (itemSpeed + 1),
      );
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
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
  }
}
