import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class DeathCoil extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I046");
  public readonly merchantItemTypeId = FourCC("I047");
  public readonly recipe: number[] = [FourCC("I02K"), FourCC("I02K")];

  private readonly timers = new Map<number, Timer>();
  private readonly totemUnitTypeId: number = FourCC("u018");

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

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const distance = RandomNumberGenerator.random(150, 250);
      const totem = Unit.create(
        owner,
        this.totemUnitTypeId,
        x + distance * Math.cos(radians),
        y + distance * Math.sin(radians),
      );
      totem.pauseEx(true);

      const wake: Timer = TimerUtils.newTimer();
      wake.start(3, false, () => {
        TimerUtils.releaseTimer(wake);

        totem.pauseEx(false);
        totem.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
        if (vehicle.unit.isAlive()) {
          totem.issueTargetOrder(OrderId.Deathcoil, vehicle.unit);
        }
      });
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
