import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Driver {
  unit?: Unit;
  // Seconds since it last pounded
  idle: number;
  timers: Timer[];
}

// Every 20 seconds a piledriver (n01S, 20 s) 100 away from the hero towards
// the nearest enemy. It pounds (A05G: 40 within 300, 0.5 s stun) every 3 s
// with one enemy ground unit within 300 of it, faster with more: every
// 3 / (1 + (n - 1) * 0.4) seconds, at most once a second (6 or more)
export class Piledriver extends WeaponUpgradeRecipe {
  public readonly cooldown = 20;
  public readonly itemTypeId = FourCC("I07M");
  public readonly merchantItemTypeId = FourCC("I07N");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05H")];

  private readonly drivers = new Map<number, Driver>();
  private readonly driverUnitId: number = FourCC("n01S");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly poundAbilityId: number = FourCC("A05G");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const driver: Driver = { idle: 0, timers: [] };
    this.drivers.set(itemId, driver);

    const drive = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (driver.unit != null && driver.unit.isAlive()) driver.unit.kill();

      const nearest = this.crowd(hero.x, hero.y, 900, owner).nearest;
      const radians =
        nearest != null
          ? Atan2(nearest.y - hero.y, nearest.x - hero.x)
          : RandomNumberGenerator.random(0, 359) * MULT;
      const x = hero.x + 100 * Math.cos(radians);
      const y = hero.y + 100 * Math.sin(radians);
      Effect.create(
        "Objects/Spawnmodels/Other/ToonBoom/ToonBoom.mdl",
        x,
        y,
      ).destroy();
      driver.unit = Unit.create(owner, this.driverUnitId, x, y, 270);
      driver.unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
      driver.idle = 0;
    };

    const pounds = TimerUtils.newTimer();
    pounds.start(0.25, true, () => {
      const unit = driver.unit;
      if (unit == null || !unit.isAlive()) return;
      driver.idle += 0.25;
      if (driver.idle < 1) return;

      const { x, y } = unit;
      const n = this.crowd(x, y, 300, owner).count;
      if (n === 0) return;
      if (driver.idle < 3 / (1 + (n - 1) * 0.4)) return;
      driver.idle = 0;
      unit.setAnimation("stand work");
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.poundAbilityId);
      dummy.issueImmediateOrder("stomp");
    });

    const t = TimerUtils.newTimer();
    t.start(this.cooldown, true, drive);
    driver.timers.push(pounds, t);
    drive();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const driver = this.drivers.get(itemId);
    this.drivers.delete(itemId);
    if (driver == null) return;
    for (const t of driver.timers) TimerUtils.releaseTimer(t);
    driver.timers.length = 0;
    if (driver.unit != null && driver.unit.isAlive()) driver.unit.kill();
  }

  // How many visible enemy ground units are within range of (x, y), and the
  // nearest of them
  private crowd(
    x: number,
    y: number,
    range: number,
    owner: MapPlayer,
  ): { count: number; nearest?: Unit } {
    let count = 0;
    let nearest: Unit | undefined;
    let nearestDist = 0;
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      count++;
      const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (nearest == null || d < nearestDist) {
        nearest = u;
        nearestDist = d;
      }
    });
    grp.destroy();
    at.destroy();
    return { count, nearest };
  }
}
