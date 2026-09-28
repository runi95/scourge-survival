import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class ElementalTwins extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I02J");
  public readonly merchantItemTypeId = FourCC("I02I");
  public readonly recipe: number[] = [FourCC("I00M"), FourCC("I00V")];

  private readonly timers = new Map<number, Timer>();
  private readonly iceElementalUnitTypeId: number = FourCC("h009");
  private readonly fireElementalUnitTypeId: number = FourCC("h008");
  private readonly itemIceElementalMap = new Map<number, Unit>();
  private readonly itemFireElementalMap = new Map<number, Unit>();
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
        const randomIceElementalAngle = RandomNumberGenerator.random(0, 359);
        const iceElementalRadian = randomIceElementalAngle * MULT;
        const iceElemental = Unit.create(
          owner,
          this.iceElementalUnitTypeId,
          x + 300 * Math.cos(iceElementalRadian),
          y + 300 * Math.sin(iceElementalRadian),
        );
        iceElemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
        iceElemental.setAnimation("birth");
        iceElemental.queueAnimation("stand");
        this.itemIceElementalMap.set(itemId, iceElemental);

        const randomFireElementalAngle = RandomNumberGenerator.random(0, 359);
        const fireElementalRadian = randomFireElementalAngle * MULT;
        const fireElemental = Unit.create(
          owner,
          this.fireElementalUnitTypeId,
          x + 300 * Math.cos(fireElementalRadian),
          y + 300 * Math.sin(fireElementalRadian),
        );
        fireElemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
        fireElemental.setAnimation("birth");
        fireElemental.queueAnimation("stand");
        this.itemFireElementalMap.set(itemId, fireElemental);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 6) {
        this.itemIceElementalMap.delete(itemId);
        this.itemFireElementalMap.delete(itemId);
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

    const iceElemental = this.itemIceElementalMap.get(itemId);
    if (iceElemental != null) {
      iceElemental.kill();
    }

    const fireElemental = this.itemFireElementalMap.get(itemId);
    if (fireElemental != null) {
      fireElemental.kill();
    }
  }
}
