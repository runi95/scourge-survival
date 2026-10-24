import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Pack {
  wolves: Unit[];
  timers: Timer[];
}

// Every 30 seconds 2 wolves (o004: 46 - 47, 15% x2 crit, 25 s). Every 6
// seconds they run (1.2 s) a circle 250 around the enemy within 700 of the
// hero with the most enemies within 250 of it, each one half of it, leaving
// a rope behind; when it closes every enemy unit within 250 of its middle is
// netted (A042: held 3 s, flyers pulled down, and 120 damage)
export class Encircle extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I09G");
  public readonly merchantItemTypeId = FourCC("I09H");
  public readonly recipe: number[] = [FourCC("I05I"), FourCC("I05G")];

  private readonly packs = new Map<number, Pack>();
  private readonly wolfUnitId: number = FourCC("o004");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A042");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pack: Pack = { wolves: [], timers: [] };
    this.packs.set(itemId, pack);

    const summon = () => {
      const hero = vehicle.unit;
      pack.wolves.length = 0;
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = hero.x + 150 * Math.cos(radians);
        const wy = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const wolf = Unit.create(owner, this.wolfUnitId, wx, wy);
        wolf.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 25);
        pack.wolves.push(wolf);
      }
    };
    const wolves = TimerUtils.newTimer();
    wolves.start(30, true, summon);

    const circle = TimerUtils.newTimer();
    circle.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      const runners = pack.wolves.filter((w) => w.isAlive());
      if (runners.length === 0) return;
      const enemies = this.enemies(hero.x, hero.y, 700, owner);
      if (enemies.length === 0) return;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let center = enemies[0];
      let most = 0;
      for (const u of enemies) {
        let n = 0;
        for (const v of enemies) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          if (dx * dx + dy * dy <= 250 * 250) n++;
        }
        if (n > most) {
          center = u;
          most = n;
        }
      }
      this.run(hero, owner, runners, center.x, center.y);
    });
    pack.timers.push(wolves, circle);
    summon();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const pack = this.packs.get(itemId);
    this.packs.delete(itemId);
    if (pack == null) return;
    for (const t of pack.timers) TimerUtils.releaseTimer(t);
    pack.timers.length = 0;
    for (const wolf of pack.wolves) {
      if (wolf.isAlive()) wolf.kill();
    }
    pack.wolves.length = 0;
  }

  // The wolves run the circle round (cx, cy), the first from its east, the
  // second from its west, each covering all of it alone
  private run(
    hero: Unit,
    owner: MapPlayer,
    runners: Unit[],
    cx: number,
    cy: number,
  ) {
    const arc = runners.length === 1 ? 2 * Math.PI : Math.PI;
    const ropes: lightning[] = [];
    const last = runners.map((_w, i) => [
      cx + 250 * Math.cos(i * Math.PI),
      cy + 250 * Math.sin(i * Math.PI),
    ]);
    let step = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      for (let i = 0; i < runners.length; i++) {
        const wolf = runners[i];
        const radians = i * Math.PI + (arc * step) / 24;
        const x = cx + 250 * Math.cos(radians);
        const y = cy + 250 * Math.sin(radians);
        if (wolf.isAlive()) {
          wolf.x = x;
          wolf.y = y;
          wolf.facing = (radians + Math.PI / 2) / MULT;
        }
        ropes.push(
          AddLightningEx("LEAS", false, last[i][0], last[i][1], 30, x, y, 30),
        );
        last[i][0] = x;
        last[i][1] = y;
      }
      if (step < 24) return;
      TimerUtils.releaseTimer(t);

      for (const u of this.enemies(cx, cy, 250, owner)) {
        const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
        dummy.addAbility(this.netAbilityId);
        dummy.issueTargetOrder("ensnare", u);
        hero.damageTarget(
          u.handle,
          120,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
      const fade = TimerUtils.newTimer();
      fade.start(0.5, false, () => {
        TimerUtils.releaseTimer(fade);
        for (const rope of ropes) DestroyLightning(rope);
      });
    });
  }

  // The visible enemy units within range of (x, y)
  private enemies(x: number, y: number, range: number, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }
}
