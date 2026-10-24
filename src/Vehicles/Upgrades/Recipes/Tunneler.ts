import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 1.25 seconds a rocket tunnelling at 700 a second after a random enemy
// within 800 (wherever it goes, for up to 2 s). Under it, 120 to it and a 1 s
// stun, and 60 to every other enemy unit within 175
export class Tunneler extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.25;
  public readonly itemTypeId = FourCC("I09I");
  public readonly merchantItemTypeId = FourCC("I09J");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I02L")];

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
      const enemies = this.enemies(hero.x, hero.y, 800, owner);
      if (enemies.length === 0) return;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      this.tunnel(hero, owner, target);
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

  // Through the ground after the target, leaving a trail of dust
  private tunnel(hero: Unit, owner: MapPlayer, target: Unit) {
    let x = hero.x;
    let y = hero.y;
    let ticks = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      ticks++;
      if (!target.isAlive() || ticks > 20) {
        TimerUtils.releaseTimer(t);
        return;
      }
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 70) {
        x += (70 * dx) / d;
        y += (70 * dy) / d;
        Effect.create(
          "Objects/Spawnmodels/Undead/ImpaleTargetDust/ImpaleTargetDust.mdl",
          x,
          y,
        ).destroy();
        return;
      }
      TimerUtils.releaseTimer(t);
      this.burst(hero, owner, target);
    });
  }

  private burst(hero: Unit, owner: MapPlayer, target: Unit) {
    const { x, y } = target;
    Effect.create(
      "Abilities/Spells/Undead/Impale/ImpaleHitTarget.mdl",
      x,
      y,
    ).destroy();
    Effect.create("Abilities/Weapons/Mortar/MortarMissile.mdl", x, y).destroy();
    hero.damageTarget(
      target.handle,
      120,
      false,
      false,
      ATTACK_TYPE_PIERCE,
      DAMAGE_TYPE_NORMAL,
      WEAPON_TYPE_WHOKNOWS,
    );
    if (target.isAlive()) StunUtils.stunUnit(target.handle, 1);
    for (const u of this.enemies(x, y, 175, owner)) {
      if (u === target) continue;
      hero.damageTarget(
        u.handle,
        60,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    }
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
