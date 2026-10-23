import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { StunUtils } from "../../../Utility/StunUtils";

const MULT = Math.PI / 180;

// Every 10 seconds 2 Treants wake by the hero, each with a goblin felling
// charge in its roots. When a Treant has fought for 10 seconds or is cut down,
// the charge blows and it topples towards the largest enemy ground group
// within 450 of it: everything under its trunk (450 long, 200 wide) is crushed
// for 200 and stunned for 1.5s
export class Timber extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I0EM");
  public readonly merchantItemTypeId = FourCC("I0EN");
  public readonly recipe: number[] = [FourCC("I05N"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly treantUnitTypeId: number = FourCC("e003");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const summon = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const x = hero.x + 150 * Math.cos(radians);
        const y = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/Treants/feralspirittarget.mdl",
          x,
          y,
        ).destroy();
        const treant = Unit.create(owner, this.treantUnitTypeId, x, y);
        this.watch(hero, owner, treant);
      }
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, summon);
    summon();
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
    x: number,
    y: number,
    radius: number,
  ): Unit[] {
    const at = Point.create(x, y);
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
    at.destroy();
    return enemies;
  }

  // The Treant fights until it is cut down or has fought for 10 seconds; then
  // its charge blows where it stood
  private watch(hero: Unit, owner: MapPlayer, treant: Unit): void {
    let age = 0;
    const t = TimerUtils.newTimer();
    t.start(0.25, true, () => {
      age += 0.25;
      if (treant.isAlive() && age < 10) return;

      TimerUtils.releaseTimer(t);
      const { x, y } = treant;
      const facing = treant.facing * MULT;
      treant.destroy();
      this.fell(hero, owner, x, y, facing);
    });
  }

  // Towards the enemy ground unit within 450 with the most enemy ground units
  // within 250 of it, else where the Treant faced
  private fell(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    facing: number,
  ): void {
    const enemies = this.groundEnemiesAround(owner, x, y, 450);
    let angle = facing;
    let most = 0;
    for (const u of enemies) {
      let count = 0;
      for (const other of enemies) {
        if ((other.x - u.x) ** 2 + (other.y - u.y) ** 2 <= 250 * 250) count++;
      }
      if (count <= most) continue;
      most = count;
      angle = Math.atan2(u.y - y, u.x - x);
    }

    Effect.create("Abilities/Weapons/Mortar/MortarMissile.mdl", x, y).destroy();
    const trunk = Effect.create("Units/NightElf/Ent/Ent.mdl", x, y);
    trunk.setYaw(angle);
    trunk.scale = 1.3;
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      const progress = Math.min(1, elapsed / 0.5);
      trunk.setOrientation(angle, (Math.PI / 2) * progress * progress, 0);
      if (progress < 1) return;

      TimerUtils.releaseTimer(t);
      this.crush(hero, owner, x, y, angle);
      const fade = TimerUtils.newTimer();
      fade.start(1, false, () => {
        TimerUtils.releaseTimer(fade);
        trunk.setAlpha(0);
        trunk.destroy();
      });
    });
  }

  // Every enemy ground unit within 100 of the trunk, from the stump to 450
  // out, takes 200 and is stunned for 1.5 seconds
  private crush(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    angle: number,
  ): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let d = 100; d <= 450; d += 100) {
      Effect.create(
        "Objects/Spawnmodels/Undead/ImpaleTargetDust/ImpaleTargetDust.mdl",
        x + d * cos,
        y + d * sin,
      ).destroy();
    }
    const enemies = this.groundEnemiesAround(
      owner,
      x + 225 * cos,
      y + 225 * sin,
      350,
    );
    for (const u of enemies) {
      const along = (u.x - x) * cos + (u.y - y) * sin;
      const side = (u.x - x) * -sin + (u.y - y) * cos;
      if (along < -50 || along > 450 || Math.abs(side) > 100) continue;

      hero.damageTarget(
        u.handle,
        200,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) StunUtils.stunUnit(u.handle, 1.5);
    }
  }
}
