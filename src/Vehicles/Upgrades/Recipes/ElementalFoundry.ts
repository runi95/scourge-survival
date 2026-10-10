import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class ElementalFoundry extends WeaponUpgradeRecipe {
  public readonly cooldown = 20;
  public readonly itemTypeId = FourCC("I064");
  public readonly merchantItemTypeId = FourCC("I065");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00M")];

  private readonly timers = new Map<number, Timer>();
  private readonly unitTypeId: number = FourCC("h002");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const hx = vehicle.unit.x;
      const hy = vehicle.unit.y;
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const sx = hx + 250 * Math.cos(radians);
        const sy = hy + 250 * Math.sin(radians);
        const summoned = Unit.create(owner, this.unitTypeId, sx, sy);
        summoned.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
        summoned.setAnimation("birth");
        summoned.queueAnimation("stand");
      }
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, tick);
    tick();
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
