import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Line {
  netted: Unit;
  rope: lightning;
  // Seconds the net still holds
  left: number;
}

interface Lines {
  lines: Line[];
  timers: Timer[];
}

// Every 1.5 seconds a net (A042: held 3 s, flyers pulled down, and 40
// damage) at a random enemy 300 - 800 from the hero (any within 800 when none
// is that far), roped to the hero while it holds. Every 4 seconds, with an
// enemy within 300 or a rope out, a stomp (A043: 90 within 300, 1.5 s stun)
// that also erupts around every roped enemy: 90 to every enemy unit within
// 175 of it, stunned for 1.5 s
export class TremorLines extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I096");
  public readonly merchantItemTypeId = FourCC("I097");
  public readonly recipe: number[] = [FourCC("I05H"), FourCC("I05G")];

  private readonly ropes = new Map<number, Lines>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A042");
  private readonly warStompAbilityId: number = FourCC("A043");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const ropes: Lines = { lines: [], timers: [] };
    this.ropes.set(itemId, ropes);

    const nets = TimerUtils.newTimer();
    nets.start(1.5, true, () => {
      const hero = vehicle.unit;
      const enemies = this.enemies(hero.x, hero.y, 800, owner);
      const far = enemies.filter((u) => {
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        return dx * dx + dy * dy >= 300 * 300;
      });
      const pool = far.length > 0 ? far : enemies;
      if (pool.length === 0) return;
      const netted = pool[RandomNumberGenerator.random(0, pool.length - 1)];

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.netAbilityId);
      dummy.issueTargetOrder("ensnare", netted);
      hero.damageTarget(
        netted.handle,
        40,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!netted.isAlive()) return;
      const rope = AddLightningEx(
        "LEAS",
        false,
        hero.x,
        hero.y,
        40,
        netted.x,
        netted.y,
        40,
      );
      ropes.lines.push({ netted, rope, left: 3 });
    });

    const follow = TimerUtils.newTimer();
    follow.start(0.1, true, () => {
      const hero = vehicle.unit;
      for (let i = ropes.lines.length - 1; i >= 0; i--) {
        const line = ropes.lines[i];
        line.left -= 0.1;
        if (line.left <= 0 || !line.netted.isAlive()) {
          DestroyLightning(line.rope);
          ropes.lines.splice(i, 1);
          continue;
        }
        MoveLightningEx(
          line.rope,
          false,
          hero.x,
          hero.y,
          40,
          line.netted.x,
          line.netted.y,
          line.netted.getflyHeight() + 40,
        );
      }
    });

    const stomp = TimerUtils.newTimer();
    stomp.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const near = this.enemies(hero.x, hero.y, 300, owner).some(
        (u) => !u.isUnitType(UNIT_TYPE_FLYING),
      );
      if (!near && ropes.lines.length === 0) return;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.warStompAbilityId);
      dummy.issueImmediateOrder("stomp");
      for (const line of ropes.lines) {
        const { x, y } = line.netted;
        Effect.create(
          "Abilities/Spells/Orc/WarStomp/WarStompCaster.mdl",
          x,
          y,
        ).destroy();
        for (const u of this.enemies(x, y, 175, owner)) {
          hero.damageTarget(
            u.handle,
            90,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
          if (u.isAlive()) StunUtils.stunUnit(u.handle, 1.5);
        }
      }
    });
    ropes.timers.push(nets, follow, stomp);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const ropes = this.ropes.get(itemId);
    this.ropes.delete(itemId);
    if (ropes == null) return;
    for (const t of ropes.timers) TimerUtils.releaseTimer(t);
    ropes.timers.length = 0;
    for (const line of ropes.lines) DestroyLightning(line.rope);
    ropes.lines.length = 0;
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
