import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class StormElemental extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I01U");
  public readonly merchantItemTypeId = FourCC("I01V");
  public readonly recipe: number[] = [FourCC("I00M"), FourCC("I00Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly stormElementalUnitTypeId: number = FourCC("h007");
  private readonly itemStormElementalMap = new Map<number, Unit>();
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

    this.itemIterations.set(itemId, 0);
    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations === 0) {
        const { x, y } = vehicle.unit;
        const randomAngle = RandomNumberGenerator.random(0, 359);
        const radian = randomAngle * MULT;
        const stormElemental = Unit.create(
          owner,
          this.stormElementalUnitTypeId,
          x + 300 * Math.cos(radian),
          y + 300 * Math.sin(radian),
        );
        stormElemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
        stormElemental.setAnimation("birth");
        stormElemental.queueAnimation("stand");
        this.itemStormElementalMap.set(itemId, stormElemental);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 6) {
        this.itemStormElementalMap.delete(itemId);
        return;
      } else if (iterations >= 7) {
        this.itemIterations.set(itemId, 0);
      }
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
    this.itemIterations.delete(itemId);

    const stormElemental = this.itemStormElementalMap.get(itemId);
    if (stormElemental == null) return;

    stormElemental.kill();
  }
}
