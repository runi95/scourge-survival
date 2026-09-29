import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class RiflemanBarracks extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I033");
  public readonly merchantItemTypeId = FourCC("I034");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00Y")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemBarracks = new Map<number, Unit>();
  private readonly barracksUnitTypeId: number = FourCC("n00R");
  private readonly riflemanUnitTypeId: number = FourCC("h00D");

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
      this.itemIterations.set(itemId, 12);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        5 * (12 - existingIterations),
      );
    }

    t.start(5, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 11) {
        this.itemIterations.set(itemId, iterations + 1);

        const barracks = this.itemBarracks.get(itemId);
        if (barracks == null || !barracks.isAlive()) return;

        this.spawn(owner, barracks.x, barracks.y);
        return;
      }

      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const barracks = Unit.create(
        owner,
        this.barracksUnitTypeId,
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
      barracks.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      this.itemBarracks.set(itemId, barracks);
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
    this.itemBarracks.delete(itemId);
  }

  private spawn(owner: MapPlayer, x: number, y: number): void {
    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    const rifleman = Unit.create(
      owner,
      this.riflemanUnitTypeId,
      x + 200 * Math.cos(radians),
      y + 200 * Math.sin(radians),
    );
    rifleman.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
  }
}
