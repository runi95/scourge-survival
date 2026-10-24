import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Weight {
  timers: Timer[];
  // Spears thrown since the last boulder
  spears: number;
}

// Spears (u00W: 17, 800) like Burrow's: every 1 s, then every 0.5 s and
// every 0.25 s as the hero keeps standing still. Every 4 seconds a boulder
// (u01P, 150 splash) at the enemy ground unit within 800 with the most enemy
// ground units within 300 of it, doing 30 + 8 per spear thrown since the
// last boulder
export class Counterweight extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I08M");
  public readonly merchantItemTypeId = FourCC("I08N");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I02L")];

  private readonly weights = new Map<number, Weight>();
  private readonly spearUnitId: number = FourCC("u00W");
  private readonly boulderUnitId: number = FourCC("u01P");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const weight: Weight = { timers: [], spears: 0 };
    this.weights.set(itemId, weight);

    // Ticks of 0.25 s between spears: 3, 1, then 0 while standing still
    let speed = 3;
    let ticks = 0;
    let lastX = vehicle.unit.x;
    let lastY = vehicle.unit.y;
    const spears = TimerUtils.newTimer();
    spears.start(0.25, true, () => {
      if (ticks < speed) {
        ticks++;
        return;
      }
      ticks = 0;

      const { x, y } = vehicle.unit;
      if (x === lastX && y === lastY) {
        if (speed === 3) speed = 1;
        else if (speed === 1) speed = 0;
      } else {
        lastX = x;
        lastY = y;
        speed = 3;
      }
      const spear = Unit.create(owner, this.spearUnitId, x, y);
      spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      weight.spears++;
    });

    const boulders = TimerUtils.newTimer();
    boulders.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();
      if (enemies.length === 0) return;

      let target = enemies[0];
      let most = 0;
      for (const u of enemies) {
        let n = 0;
        for (const v of enemies) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          if (dx * dx + dy * dy <= 300 * 300) n++;
        }
        if (n > most) {
          target = u;
          most = n;
        }
      }

      const boulder = Unit.create(owner, this.boulderUnitId, hero.x, hero.y);
      boulder.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      // The unit's own 1d2 makes up the rest
      boulder.setBaseDamage(28 + 8 * weight.spears, 0);
      boulder.issueTargetOrder("attack", target);
      weight.spears = 0;
    });
    weight.timers.push(spears, boulders);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const weight = this.weights.get(itemId);
    this.weights.delete(itemId);
    if (weight == null) return;
    for (const t of weight.timers) TimerUtils.releaseTimer(t);
    weight.timers.length = 0;
  }
}
