import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 3 seconds a bolt (A05J: 60 to air and ground along 1100, 100
// wide, at 1500 a second) at the enemy within 1100 whose line from the hero
// holds the most enemies; the farthest enemy on that line is stunned for
// 1.5 s when the bolt gets to it
export class Skewer extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I082");
  public readonly merchantItemTypeId = FourCC("I083");
  public readonly recipe: number[] = [FourCC("I02M"), FourCC("I05F")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly boltAbilityId: number = FourCC("A05J");

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
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(1100, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();
      if (enemies.length === 0) return;

      // The line towards each enemy, and the enemies 100 wide along it
      const { x, y } = hero;
      let best: Unit[] = [];
      let bestRadians = 0;
      for (const aim of enemies) {
        const radians = Atan2(aim.y - y, aim.x - x);
        const ca = Math.cos(radians);
        const sa = Math.sin(radians);
        const line: Unit[] = [];
        for (const u of enemies) {
          const along = (u.x - x) * ca + (u.y - y) * sa;
          const across = -(u.x - x) * sa + (u.y - y) * ca;
          if (along < 0 || along > 1100) continue;
          if (across < -100 || across > 100) continue;
          line.push(u);
        }
        if (line.length > best.length) {
          best = line;
          bestRadians = radians;
        }
      }

      const ca = Math.cos(bestRadians);
      const sa = Math.sin(bestRadians);
      let last = best[0];
      let lastAlong = 0;
      for (const u of best) {
        const along = (u.x - x) * ca + (u.y - y) * sa;
        if (along > lastAlong) {
          last = u;
          lastAlong = along;
        }
      }

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.boltAbilityId);
      dummy.issueOrderAt("shockwave", x + 400 * ca, y + 400 * sa);

      const pin = TimerUtils.newTimer();
      pin.start(lastAlong / 1500, false, () => {
        TimerUtils.releaseTimer(pin);
        if (!last.isAlive()) return;
        Effect.createAttachment(
          "Abilities/Weapons/BallistaMissile/BallistaMissileTarget.mdl",
          last,
          "chest",
        ).destroy();
        StunUtils.stunUnit(last.handle, 1.5);
      });
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
}
