import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

const MULT = Math.PI / 180;

export class ShockwaveStorm extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.25;
  public readonly itemTypeId = FourCC("I01A");
  public readonly merchantItemTypeId = FourCC("I019");
  public readonly recipe: number[] = [FourCC("I00X"), FourCC("I002")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shockwaveAbilityId: number = FourCC("A008");
  private readonly itemIterations = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    this.itemIterations.set(itemId, 0);
    t.start(0.25, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations >= 7) {
        this.itemIterations.set(itemId, 0);
      } else {
        this.itemIterations.set(itemId, iterations + 1);
      }

      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const angle = 45 * iterations;
      const radians = [angle * MULT, ((angle + 180) % 360) * MULT];
      for (let i = 0; i < 2; i++) {
        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
        dummy.addAbility(this.shockwaveAbilityId);

        dummy.issueOrderAt(
          "shockwave",
          x + 400 * Math.cos(radians[i]),
          y + 400 * Math.sin(radians[i])
        );
      }
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
    this.itemIterations.delete(itemId);
  }
}
