import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

export class BerserkerRage extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I03J");
  public readonly merchantItemTypeId = FourCC("I03K");
  public readonly recipe: number[] = [FourCC("I02M"), FourCC("I02L")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemElapsed = new Map<number, number>();
  private readonly dummyUnitId: number = FourCC("u00X");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.itemElapsed.set(itemId, 0);

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.25, true, () => {
      const elapsed = this.itemElapsed.get(itemId) + 0.25;
      const lifePercent = vehicle.unit.life / vehicle.unit.maxLife;
      const cooldown = 0.5 + 1.5 * lifePercent;
      if (elapsed < cooldown) {
        this.itemElapsed.set(itemId, elapsed);
        return;
      }

      this.itemElapsed.set(itemId, 0);

      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        cooldown,
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
    this.itemElapsed.delete(itemId);
  }
}
