import { Effect, FogModifier, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 8 seconds a goblin harvester drives 700 out from the hero through the
// largest group of enemy ground units within 800. Its reel of vines catches
// every enemy ground unit in front of it and carries it along under the
// blades, and at the end of the row the vines plant the whole catch, rooted
export class Harvester extends WeaponUpgradeRecipe {
  public readonly cooldown = 8;
  public readonly itemTypeId = FourCC("I0CO");
  public readonly merchantItemTypeId = FourCC("I0CP");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05P")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly rootsAbilityId: number = FourCC("A046");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      const target = this.largestGroup(hero, owner);
      if (target == null) return;

      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.drive(hero, owner, Math.atan2(target.y - hero.y, target.x - hero.x));
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
  }

  private groundEnemiesAround(
    owner: MapPlayer,
    at: Point,
    radius: number,
  ): Unit[] {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      enemies.push(u);
    });
    grp.destroy();
    return enemies;
  }

  // The enemy ground unit within 800 of the hero with the most enemy ground
  // units within 250 of it
  private largestGroup(hero: Unit, owner: MapPlayer): Unit | undefined {
    const enemies = this.groundEnemiesAround(owner, hero.point, 800);
    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - u.x;
        const dy = other.y - u.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= most) continue;
      most = count;
      best = u;
    }
    return best;
  }

  // The harvester drives at 400 a second. Every enemy ground unit within 130
  // of its reel is caught and held in front of it, shredded for 25 every 0.25
  // seconds, until the harvester stops 700 from where it set out (or earlier,
  // at a cliff or water)
  private drive(hero: Unit, owner: MapPlayer, angle: number): void {
    let x = hero.x;
    let y = hero.y;
    const harvester = Effect.create(
      "Units/Creeps/IronGolem/IronGolem.mdl",
      x,
      y,
    );
    harvester.setYaw(angle);
    harvester.playAnimation(ANIM_TYPE_WALK);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const reel = Point.create(x, y);
    // Each caught enemy and how far to the side of the reel it is held
    const caught: [Unit, number][] = [];
    let travelled = 0;
    let ticks = 0;

    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      ticks++;
      const blocked = IsTerrainPathable(
        x + 180 * cos,
        y + 180 * sin,
        PATHING_TYPE_WALKABILITY,
      );
      if (!blocked) {
        travelled += 12.5;
        x += 12.5 * cos;
        y += 12.5 * sin;
        harvester.x = x;
        harvester.y = y;
      }

      reel.setPosition(x + 70 * cos, y + 70 * sin);
      for (const u of this.groundEnemiesAround(owner, reel, 130)) {
        if (caught.some(([c]) => c.handle === u.handle)) continue;

        const side = (u.x - x) * -sin + (u.y - y) * cos;
        caught.push([u, Math.max(-90, Math.min(90, side))]);
        StunUtils.stunUnit(u.handle, (700 - travelled) / 400 + 0.5);
      }

      for (const [u, side] of caught) {
        if (!u.isAlive()) continue;

        const ux = x + 70 * cos - side * sin;
        const uy = y + 70 * sin + side * cos;
        if (!IsTerrainPathable(ux, uy, PATHING_TYPE_WALKABILITY)) {
          u.x = ux;
          u.y = uy;
        }
        if (ticks % 8 !== 0) continue;
        hero.damageTarget(
          u.handle,
          25,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        Effect.createAttachment(
          "Objects/Spawnmodels/Critters/Little_Blood/LittleBloodExplosion.mdl",
          u,
          "chest",
        ).destroy();
      }
      if (travelled < 700 && !blocked) return;

      TimerUtils.releaseTimer(t);
      reel.destroy();
      // Hidden first, so it doesn't play its death
      harvester.setAlpha(0);
      harvester.destroy();
      // The catch is let go, then planted once it can be targeted again. The
      // row's end is shown, so the vines reach the catch on high ground too
      for (const [u] of caught) StunUtils.removeStun(u.id);
      const sight = FogModifier.create(
        owner,
        FOG_OF_WAR_VISIBLE,
        x + 70 * cos,
        y + 70 * sin,
        300,
        true,
        false,
      );
      sight.start();
      let planted = false;
      const later = TimerUtils.newTimer();
      later.start(0.1, true, () => {
        if (planted) {
          TimerUtils.releaseTimer(later);
          sight.destroy();
          return;
        }
        planted = true;
        for (const [u] of caught) {
          if (!u.isAlive()) continue;
          this.plant(owner, u);
        }
      });
    });
  }

  // The vines root the enemy where it was dropped (A046: 50 per second for
  // 2.5 seconds)
  private plant(owner: MapPlayer, target: Unit): void {
    const dummy = Unit.create(owner, this.dummyUnitId, target.x, target.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
    dummy.addAbility(this.rootsAbilityId);
    dummy.issueTargetOrder("entanglingroots", target);
  }
}
