import { Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

// A goblin ray of shadow, 600 long, sweeps 90 degrees across the largest
// group in 1.5 seconds. It hurts and curses every enemy it crosses, like
// Shadow Bolt does, 10% harder for every curse already on it
export class DeathRay extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0BQ");
  public readonly merchantItemTypeId = FourCC("I0BR");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  // The Shadow Bolt curse: its level is how many curses an enemy carries
  private readonly curseAbilityId: number = FourCC("A016");

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

      const target = this.largestGroup(vehicle.unit, owner);
      if (target == null) return;

      const { x, y } = vehicle.unit;
      this.sweep(owner, vehicle.unit, Math.atan2(target.y - y, target.x - x));
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

  // From 45 degrees to one side of the middle to 45 to the other, 6 every
  // 0.1 seconds, from wherever the hero is
  private sweep(owner: MapPlayer, hero: Unit, middle: number): void {
    let angle = middle - 45 * MULT;
    const ray = AddLightningEx(
      "AFOD",
      false,
      hero.x,
      hero.y,
      60,
      hero.x + 600 * Math.cos(angle),
      hero.y + 600 * Math.sin(angle),
      30,
    );
    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    const at = Point.create(hero.x, hero.y);
    const struck = new Set<number>();
    let steps = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      const { x, y } = hero;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      MoveLightningEx(ray, false, x, y, 60, x + 600 * dx, y + 600 * dy, 30);
      at.setPosition(x + 300 * dx, y + 300 * dy);
      const grp = Group.fromRange(320, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (struck.has(u.id)) return;
        // Within 75 of the ray, on its side of the hero
        const along = (u.x - x) * dx + (u.y - y) * dy;
        const across = Math.abs((u.y - y) * dx - (u.x - x) * dy);
        if (along < 0 || along > 600 || across > 75) return;

        struck.add(u.id);
        const curses = u.getAbilityLevel(this.curseAbilityId);
        dummy.damageTarget(
          u.handle,
          100 * (1 + 0.1 * curses),
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (curses === 0) u.addAbility(this.curseAbilityId);
        else if (curses < 10)
          u.setAbilityLevel(this.curseAbilityId, curses + 1);
      });
      grp.destroy();

      steps++;
      angle += 6 * MULT;
      if (steps <= 15) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      DestroyLightning(ray);
    });
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(600, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      candidates.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let bestCount = 0;
    for (const candidate of candidates) {
      let count = 0;
      for (const other of candidates) {
        const dx = other.x - candidate.x;
        const dy = other.y - candidate.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= bestCount) continue;
      best = candidate;
      bestCount = count;
    }
    return best;
  }
}
