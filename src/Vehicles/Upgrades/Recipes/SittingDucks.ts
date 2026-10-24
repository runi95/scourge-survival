import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { SittingDucksDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/SittingDucksDamageEvent";

interface Spot {
  x: number;
  y: number;
}

interface Hunt {
  // Where every enemy within 900 of the hero last stood
  spots: Map<Unit, Spot>;
  timers: Timer[];
}

// Every 0.25 s how long every enemy within 900 of the hero has stood still
// (SittingDucksDamageEvent: spears 50% harder a second, up to x3). Every 0.4
// seconds a spear (u02O: 15 - 29) at the enemy within 800 that has stood still
// the longest (the nearest of those). Every 3 seconds a net (A042: held 3 s,
// flyers pulled down, and 40 damage) at the nearest moving enemy within 600
export class SittingDucks extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I09O");
  public readonly merchantItemTypeId = FourCC("I09P");
  public readonly recipe: number[] = [FourCC("I02L"), FourCC("I05G")];

  private readonly hunts = new Map<number, Hunt>();
  private readonly spearUnitId: number = FourCC("u02O");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A042");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hunt: Hunt = { spots: new Map(), timers: [] };
    this.hunts.set(itemId, hunt);
    const still = SittingDucksDamageEvent.STILL;

    const watch = TimerUtils.newTimer();
    watch.start(0.25, true, () => {
      const hero = vehicle.unit;
      const seen = new Set<Unit>();
      const grp = Group.fromRange(900, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        seen.add(u);
        const spot = hunt.spots.get(u);
        if (spot != null && spot.x === u.x && spot.y === u.y) {
          still.set(u.id, (still.get(u.id) ?? 0) + 0.25);
          return;
        }
        hunt.spots.set(u, { x: u.x, y: u.y });
        still.set(u.id, 0);
      });
      grp.destroy();
      const gone: Unit[] = [];
      hunt.spots.forEach((_spot, u) => {
        if (!seen.has(u)) gone.push(u);
      });
      for (const u of gone) {
        hunt.spots.delete(u);
        still.delete(u.id);
      }
    });

    const spears = TimerUtils.newTimer();
    spears.start(0.4, true, () => {
      const hero = vehicle.unit;
      let target: Unit | undefined;
      let longest = 0;
      let nearest = 0;
      hunt.spots.forEach((_spot, u) => {
        if (!u.isAlive() || !u.isVisible(owner)) return;
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        const d = dx * dx + dy * dy;
        if (d > 800 * 800) return;
        const s = still.get(u.id) ?? 0;
        if (target == null || s > longest || (s === longest && d < nearest)) {
          target = u;
          longest = s;
          nearest = d;
        }
      });
      if (target == null) return;
      const spear = Unit.create(owner, this.spearUnitId, hero.x, hero.y);
      spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      spear.issueTargetOrder("attack", target);
    });

    const nets = TimerUtils.newTimer();
    nets.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      let target: Unit | undefined;
      let nearest = 0;
      hunt.spots.forEach((_spot, u) => {
        if (!u.isAlive() || !u.isVisible(owner)) return;
        if ((still.get(u.id) ?? 0) > 0) return;
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        const d = dx * dx + dy * dy;
        if (d > 600 * 600) return;
        if (target == null || d < nearest) {
          target = u;
          nearest = d;
        }
      });
      if (target == null) return;
      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.netAbilityId);
      dummy.issueTargetOrder("ensnare", target);
      hero.damageTarget(
        target.handle,
        40,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    hunt.timers.push(watch, spears, nets);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const hunt = this.hunts.get(itemId);
    this.hunts.delete(itemId);
    if (hunt == null) return;
    for (const t of hunt.timers) TimerUtils.releaseTimer(t);
    hunt.timers.length = 0;
    hunt.spots.forEach((_spot, u) =>
      SittingDucksDamageEvent.STILL.delete(u.id),
    );
    hunt.spots.clear();
  }
}
