import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

export class LocustSwarm extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I01Y");
  public readonly merchantItemTypeId = FourCC("I01Z");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly locustSwarmAbilityId: number = FourCC("A02G");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.releaseSwarm(vehicle, owner);
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

  private releaseSwarm(vehicle: Vehicle, owner: MapPlayer): void {
    const { x, y } = vehicle.unit;
    const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 7);
    dummy.addAbility(this.locustSwarmAbilityId);
    dummy.issueImmediateOrder("locustswarm");

    const t = TimerUtils.newTimer();
    t.start(0.5, true, () => {
      if (!dummy.isAlive()) {
        TimerUtils.releaseTimer(t);
        return;
      }

      dummy.x = vehicle.unit.x;
      dummy.y = vehicle.unit.y;
    });
  }
}
