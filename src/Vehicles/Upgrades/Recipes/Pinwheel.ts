import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 4 seconds a storm hammer flies 1000 a second to the enemy within 700
// of the hero with the most enemies within 250 of it. For 4 s it spins round
// that spot 120 out, a turn every 0.6 s: every enemy within 100 of it takes 25
// and a 0.5 s stun, at most once a second each, and every 0.25 s a spark does
// 15 to a random enemy within 400. Then it crashes: 60 to every enemy within
// 200 of the spot
export class Pinwheel extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I074");
  public readonly merchantItemTypeId = FourCC("I075");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I05D")];

  private readonly timers = new Map<number, Timer>();

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
      const grp = Group.fromRange(700, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();
      let target: Unit | undefined;
      let most = 0;
      for (const u of enemies) {
        let around = 0;
        for (const v of enemies) {
          if ((v.x - u.x) ** 2 + (v.y - u.y) ** 2 <= 250 * 250) around++;
        }
        if (around > most) {
          target = u;
          most = around;
        }
      }
      if (target == null) return;
      this.spin(hero, owner, target.x, target.y);
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

  private spin(hero: Unit, owner: MapPlayer, cx: number, cy: number) {
    const hammer = Effect.create(
      "Abilities/Spells/Human/StormBolt/StormBoltMissile.mdl",
      hero.x,
      hero.y,
    );
    hammer.z = 80;
    const sx = hero.x;
    const sy = hero.y;
    const flight = Math.max(
      1,
      Math.ceil(Math.sqrt((cx - sx) ** 2 + (cy - sy) ** 2) / 50),
    );
    // When each enemy was last struck, in ticks
    const struck = new Map<Unit, number>();
    let tick = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      tick++;
      if (tick <= flight) {
        hammer.x = sx + ((cx - sx) * tick) / flight;
        hammer.y = sy + ((cy - sy) * tick) / flight;
        return;
      }

      const spun = tick - flight;
      if (spun <= 80) {
        // A turn every 0.6 s
        const radians = (spun * 2 * Math.PI) / 12;
        const hx = cx + 120 * Math.cos(radians);
        const hy = cy + 120 * Math.sin(radians);
        hammer.x = hx;
        hammer.y = hy;
        hammer.setYaw(radians + Math.PI / 2);
        this.strike(hero, owner, hx, hy, struck, tick);
        if (spun % 5 === 0) this.spark(hero, owner, hx, hy, cx, cy);
        return;
      }

      TimerUtils.releaseTimer(t);
      hammer.destroy();
      Effect.create(
        "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
        cx,
        cy,
      ).destroy();
      Effect.create(
        "Abilities/Spells/Human/StormBolt/StormBoltTarget.mdl",
        cx,
        cy,
      ).destroy();
      const at = Point.create(cx, cy);
      const grp = Group.fromRange(200, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hero.damageTarget(
          u.handle,
          60,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
      at.destroy();
    });
  }

  private strike(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    struck: Map<Unit, number>,
    tick: number,
  ) {
    const at = Point.create(x, y);
    const grp = Group.fromRange(100, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      const last = struck.get(u);
      if (last != null && tick - last < 20) return;

      struck.set(u, tick);
      hero.damageTarget(
        u.handle,
        25,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) StunUtils.stunUnit(u.handle, 0.5);
    });
    grp.destroy();
    at.destroy();
  }

  private spark(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    cx: number,
    cy: number,
  ) {
    const enemies: Unit[] = [];
    const at = Point.create(cx, cy);
    const grp = Group.fromRange(400, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    if (enemies.length === 0) return;
    const u = enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
    Effect.create(
      "Abilities/Weapons/RocketMissile/RocketMissile.mdl",
      x,
      y,
    ).destroy();
    Effect.createAttachment(
      "Abilities/Weapons/GyroCopter/GyroCopterImpact.mdl",
      u,
      "chest",
    ).destroy();
    hero.damageTarget(
      u.handle,
      15,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
  }
}
