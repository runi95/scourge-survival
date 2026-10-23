import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

// An arrow at the nearest enemy that pierces everything on its way. When it
// reaches it, it ricochets on to the nearest enemy ahead of it that it has not
// hit, up to 8 legs. Every leg costs the hero 2 mana and sears; a leg the hero
// can't pay for is a plain arrow that stops where it lands
export class RicochetArrow extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I0CU");
  public readonly merchantItemTypeId = FourCC("I0CV");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I05R")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");

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
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const hero = vehicle.unit;
      const target = this.nearest(owner, hero.x, hero.y, 600, new Set());
      if (target == null) return;

      this.fly(hero, owner, hero.x, hero.y, target, 1, new Set());
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

  // One leg at 1500 a second, hitting every enemy within 60 of the arrow
  private fly(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    target: Unit,
    leg: number,
    hit: Set<number>,
  ): void {
    const searing = hero.mana >= 2;
    if (searing) hero.mana -= 2;
    const arrow = Effect.create(
      searing
        ? "Abilities/Weapons/SearingArrow/SearingArrowMissile.mdl"
        : "Abilities/Weapons/Arrow/ArrowMissile.mdl",
      x,
      y,
    );
    arrow.setHeight(60);
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    const at = Point.create(x, y);
    let angle = Math.atan2(target.y - y, target.x - x);

    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      if (target.isAlive()) angle = Math.atan2(target.y - y, target.x - x);
      const left = Math.sqrt((target.x - x) ** 2 + (target.y - y) ** 2);
      const step = Math.min(47, left);
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
      arrow.x = x;
      arrow.y = y;
      arrow.setYaw(angle);
      at.setPosition(x, y);

      const grp = Group.fromRange(60, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (hit.has(u.id)) return;

        hit.add(u.id);
        dummy.damageTarget(
          u.handle,
          searing ? 120 : 60,
          false,
          false,
          ATTACK_TYPE_PIERCE,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();

      // A target that died on the way still has its spot to fly to
      if (step < left) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      arrow.destroy();
      if (!searing || leg >= 8) return;

      const next = this.nearest(owner, x, y, 500, hit, angle);
      if (next == null) return;
      this.fly(hero, owner, x, y, next, leg + 1, hit);
    });
  }

  // The nearest enemy it has not hit, only ahead of it (within 100 degrees of
  // its flight) when it is ricocheting
  private nearest(
    owner: MapPlayer,
    x: number,
    y: number,
    range: number,
    hit: Set<number>,
    heading?: number,
  ): Unit | undefined {
    const at = Point.create(x, y);
    let best: Unit | undefined;
    let bestDistance = 0;
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (hit.has(u.id)) return;

      if (heading != null) {
        let turn = Math.atan2(u.y - y, u.x - x) - heading;
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
        if (Math.abs(turn) > 100 * MULT) return;
      }

      const d = (u.x - x) ** 2 + (u.y - y) ** 2;
      if (best != null && d >= bestDistance) return;
      best = u;
      bestDistance = d;
    });
    grp.destroy();
    at.destroy();
    return best;
  }
}
