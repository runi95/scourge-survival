import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class DragonWhelpForge extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I054");
  public readonly merchantItemTypeId = FourCC("I055");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemForges = new Map<number, Unit>();
  private readonly forgeUnitTypeId: number = FourCC("n010");
  private readonly whelpUnitTypeId: number = FourCC("n00Z");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    const existingIterations = this.itemIterations.get(itemId);
    if (existingIterations == null) {
      this.itemIterations.set(itemId, 15);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        4 * (15 - existingIterations),
      );
    }

    t.start(4, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 14) {
        this.itemIterations.set(itemId, iterations + 1);

        // A whelp every 8 seconds
        if (iterations % 2 === 0) return;
        const forge = this.itemForges.get(itemId);
        if (forge == null || !forge.isAlive()) return;

        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const whelp = Unit.create(
          owner,
          this.whelpUnitTypeId,
          forge.x + 150 * Math.cos(radians),
          forge.y + 150 * Math.sin(radians),
        );
        whelp.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
        return;
      }

      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const forge = Unit.create(
        owner,
        this.forgeUnitTypeId,
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
      forge.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      this.itemForges.set(itemId, forge);
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
    this.itemForges.delete(itemId);
  }
}
