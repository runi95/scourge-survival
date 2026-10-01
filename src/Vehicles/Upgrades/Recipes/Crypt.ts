import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class Crypt extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I042");
  public readonly merchantItemTypeId = FourCC("I043");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I02K")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemCrypts = new Map<number, Unit>();
  private readonly cryptUnitTypeId: number = FourCC("n00W");
  private readonly ghoulUnitTypeId: number = FourCC("u016");

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

        const crypt = this.itemCrypts.get(itemId);
        if (crypt == null || !crypt.isAlive()) return;

        this.spawn(owner, crypt.x, crypt.y);
        return;
      }

      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const crypt = Unit.create(
        owner,
        this.cryptUnitTypeId,
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
      crypt.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      this.itemCrypts.set(itemId, crypt);
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
    this.itemCrypts.delete(itemId);
  }

  private spawn(owner: MapPlayer, x: number, y: number): void {
    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    const ghoul = Unit.create(
      owner,
      this.ghoulUnitTypeId,
      x + 200 * Math.cos(radians),
      y + 200 * Math.sin(radians),
    );
    ghoul.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);

    let nearest: Unit | undefined;
    let nearestDistance = 2250000;
    const grp = Group.fromRange(1500, ghoul.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      const distance = Math.pow(u.x - ghoul.x, 2) + Math.pow(u.y - ghoul.y, 2);
      if (distance < nearestDistance) {
        nearest = u;
        nearestDistance = distance;
      }
    });
    grp.destroy();

    if (nearest != null) ghoul.issueTargetOrder("attack", nearest);
  }
}
