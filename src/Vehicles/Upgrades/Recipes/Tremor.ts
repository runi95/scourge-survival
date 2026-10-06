import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class Tremor extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I03F");
  public readonly merchantItemTypeId = FourCC("I03G");
  public readonly recipe: number[] = [FourCC("I002"), FourCC("I02L")];

  private readonly timers = new Map<number, Timer>();
  private readonly unitPositions = new Map<number, [number, number]>();
  private readonly itemSpeedMultipliers = new Map<number, number>();
  private readonly itemIterations = new Map<number, number>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shockwaveAbilityId: number = FourCC("A00P");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.unitPositions.set(itemId, [vehicle.unit.x, vehicle.unit.y]);
    this.itemSpeedMultipliers.set(itemId, 7);
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
        if (itemSpeed === 7) {
          itemSpeed = 3;
          this.itemSpeedMultipliers.set(itemId, 3);
        } else if (itemSpeed === 3) {
          itemSpeed = 1;
          this.itemSpeedMultipliers.set(itemId, 1);
        }
      } else {
        pos[0] = x;
        pos[1] = y;
        itemSpeed = 7;
        this.itemSpeedMultipliers.set(itemId, 7);
      }

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        0.25 * (itemSpeed + 1),
      );
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.shockwaveAbilityId);
      dummy.issueOrderAt(
        "shockwave",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
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
