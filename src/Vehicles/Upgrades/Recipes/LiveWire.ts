import { Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Every 3 seconds a net (A042: held 3 s, flyers pulled down, and 40 damage)
// at the enemy within 600 with the most enemies within 300 of it. Every 0.5 s
// for 3 s, while it lives, it takes 45 and every other enemy within 300 of it
// takes 50 (lightning)
export class LiveWire extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I08U");
  public readonly merchantItemTypeId = FourCC("I08V");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I05G")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A042");

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

      const enemies = this.enemies(hero.x, hero.y, 600, owner);
      if (enemies.length === 0) return;
      let wire = enemies[0];
      let most = 0;
      for (const u of enemies) {
        let n = 0;
        for (const v of enemies) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          if (dx * dx + dy * dy <= 300 * 300) n++;
        }
        if (n > most) {
          wire = u;
          most = n;
        }
      }

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.netAbilityId);
      dummy.issueTargetOrder("ensnare", wire);
      hero.damageTarget(
        wire.handle,
        40,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_LIGHTNING,
        WEAPON_TYPE_WHOKNOWS,
      );
      this.live(hero, owner, wire);
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

  // Lightning arcs from the netted enemy for as long as it is held
  private live(hero: Unit, owner: MapPlayer, wire: Unit) {
    let arcs = 0;
    const t = TimerUtils.newTimer();
    t.start(0.5, true, () => {
      if (++arcs > 6 || !wire.isAlive()) {
        TimerUtils.releaseTimer(t);
        return;
      }
      hero.damageTarget(
        wire.handle,
        45,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_LIGHTNING,
        WEAPON_TYPE_WHOKNOWS,
      );
      const z = wire.getflyHeight() + 60;
      for (const u of this.enemies(wire.x, wire.y, 300, owner)) {
        if (u === wire) continue;
        const arc = AddLightningEx(
          "CLSB",
          false,
          wire.x,
          wire.y,
          z,
          u.x,
          u.y,
          u.getflyHeight() + 60,
        );
        const fade = TimerUtils.newTimer();
        fade.start(0.25, false, () => {
          TimerUtils.releaseTimer(fade);
          DestroyLightning(arc);
        });
        hero.damageTarget(
          u.handle,
          50,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_LIGHTNING,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
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
