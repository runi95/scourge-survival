import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Storm {
  machine: Unit;
  x: number;
  y: number;
  // Seconds the machine has run
  age: number;
  timer: Timer;
}

// Every 15 seconds a weather machine (n01Y, 12 s) on walkable ground 200 from
// the hero. A storm starts over the enemy within 900 of the hero with the
// most enemies within 300 of it and drifts 150 a second after that enemy
// (chosen again every second). Every second the storm does 35 + 5 for every
// second the machine has run to every enemy within 150 + 20 for every second
// of it, up to 90 within 370 after 11 s
export class WeatherMachine extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I066");
  public readonly merchantItemTypeId = FourCC("I067");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05E")];

  private readonly timers = new Map<number, Timer>();
  private readonly storms = new Map<number, Storm>();
  private readonly machineUnitId: number = FourCC("n01Y");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const setUp = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.stop(itemId);

      const start = RandomNumberGenerator.random(0, 359);
      let x = hero.x;
      let y = hero.y;
      for (let i = 0; i < 12; i++) {
        const radians = (start + 30 * i) * MULT;
        x = hero.x + 200 * Math.cos(radians);
        y = hero.y + 200 * Math.sin(radians);
        if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) break;
      }
      const machine = Unit.create(owner, this.machineUnitId, x, y, 270);
      machine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 12);
      const storm: Storm = {
        machine,
        x: hero.x,
        y: hero.y,
        age: -1,
        timer: TimerUtils.newTimer(),
      };
      const group = this.largestGroup(owner, hero);
      if (group != null) {
        storm.x = group.x;
        storm.y = group.y;
      }
      this.storms.set(itemId, storm);
      storm.timer.start(1, true, () => this.blow(itemId, storm, owner, hero));
    };
    setUp();
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, setUp);
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
    const storm = this.storms.get(itemId);
    this.stop(itemId);
    if (storm != null) storm.machine.kill();
  }

  private stop(itemId: number) {
    const storm = this.storms.get(itemId);
    this.storms.delete(itemId);
    if (storm == null) return;
    TimerUtils.releaseTimer(storm.timer);
  }

  private blow(itemId: number, storm: Storm, owner: MapPlayer, hero: Unit) {
    storm.age++;
    if (storm.age >= 12 || !storm.machine.isAlive()) {
      this.stop(itemId);
      return;
    }

    const group = this.largestGroup(owner, hero);
    if (group != null) {
      const dx = group.x - storm.x;
      const dy = group.y - storm.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const step = Math.min(150, d);
      if (d > 0) {
        storm.x += (step * dx) / d;
        storm.y += (step * dy) / d;
      }
    }

    const radius = 150 + 20 * storm.age;
    // Shards over the whole storm, more as it grows
    const shards = 2 + Math.floor(radius / 75);
    for (let i = 0; i < shards; i++) {
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const r = RandomNumberGenerator.random(0, radius);
      Effect.create(
        "Abilities/Spells/Human/Blizzard/BlizzardTarget.mdl",
        storm.x + r * Math.cos(radians),
        storm.y + r * Math.sin(radians),
      ).destroy();
    }

    const at = Point.create(storm.x, storm.y);
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      hero.damageTarget(
        u.handle,
        35 + 5 * storm.age,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    at.destroy();
  }

  // The enemy within 900 of the hero with the most enemies within 300 of it
  private largestGroup(owner: MapPlayer, hero: Unit): Unit | undefined {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(900, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let around = 0;
      for (const v of enemies) {
        if ((v.x - u.x) ** 2 + (v.y - u.y) ** 2 <= 300 * 300) around++;
      }
      if (around > most) {
        best = u;
        most = around;
      }
    }
    return best;
  }
}
