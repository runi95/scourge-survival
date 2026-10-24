import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

const MULT = Math.PI / 180;

interface Wolf {
  unit: Unit;
  // Seconds until its next leap
  wait: number;
}

interface Pack {
  wolves: Wolf[];
  timers: Timer[];
}

// Every 30 seconds 2 wolves (o004: 46 - 47, 15% x2 crit, 25 s). Every 3
// seconds each one leaps (0.4 s) onto the enemy ground unit within 500 of it
// with the most enemy ground units within 250, and lands with a stomp: 80 to
// every enemy ground unit within 250, stunned for 1 s
export class Pounce extends WeaponUpgradeRecipe {
  public readonly cooldown = 30;
  public readonly itemTypeId = FourCC("I08Y");
  public readonly merchantItemTypeId = FourCC("I08Z");
  public readonly recipe: number[] = [FourCC("I05H"), FourCC("I05I")];

  private readonly packs = new Map<number, Pack>();
  private readonly wolfUnitId: number = FourCC("o004");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pack: Pack = { wolves: [], timers: [] };
    this.packs.set(itemId, pack);

    const summon = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = hero.x + 150 * Math.cos(radians);
        const wy = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const unit = Unit.create(owner, this.wolfUnitId, wx, wy);
        unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 25);
        pack.wolves.push({ unit, wait: 1 + 2 * i });
      }
    };

    const leaps = TimerUtils.newTimer();
    leaps.start(0.25, true, () => {
      for (let i = pack.wolves.length - 1; i >= 0; i--) {
        const wolf = pack.wolves[i];
        if (!wolf.unit.isAlive()) {
          pack.wolves.splice(i, 1);
          continue;
        }
        wolf.wait -= 0.25;
        if (wolf.wait > 0) continue;
        const target = this.thickest(wolf.unit, owner);
        if (target == null) continue;
        wolf.wait = 3;
        this.leap(vehicle.unit, owner, wolf.unit, target.x, target.y);
      }
    });

    const t = TimerUtils.newTimer();
    t.start(this.cooldown, true, summon);
    pack.timers.push(leaps, t);
    summon();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const pack = this.packs.get(itemId);
    this.packs.delete(itemId);
    if (pack == null) return;
    for (const t of pack.timers) TimerUtils.releaseTimer(t);
    pack.timers.length = 0;
    for (const wolf of pack.wolves) {
      if (wolf.unit.isAlive()) wolf.unit.kill();
    }
    pack.wolves.length = 0;
  }

  private leap(
    hero: Unit,
    owner: MapPlayer,
    wolf: Unit,
    tx: number,
    ty: number,
  ) {
    const sx = wolf.x;
    const sy = wolf.y;
    wolf.setAnimation("attack");
    let step = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      if (!wolf.isAlive()) {
        TimerUtils.releaseTimer(t);
        return;
      }
      wolf.x = sx + ((tx - sx) * step) / 8;
      wolf.y = sy + ((ty - sy) * step) / 8;
      if (step < 8) return;
      TimerUtils.releaseTimer(t);

      Effect.create(
        "Abilities/Spells/Orc/WarStomp/WarStompCaster.mdl",
        tx,
        ty,
      ).destroy();
      for (const u of this.enemies(tx, ty, 250, owner)) {
        hero.damageTarget(
          u.handle,
          80,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (u.isAlive()) StunUtils.stunUnit(u.handle, 1);
      }
    });
  }

  // The enemy ground unit within 500 of the wolf with the most others
  // within 250 of it
  private thickest(wolf: Unit, owner: MapPlayer): Unit | undefined {
    const enemies = this.enemies(wolf.x, wolf.y, 500, owner);
    let thickest: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let n = 0;
      for (const v of enemies) {
        const dx = v.x - u.x;
        const dy = v.y - u.y;
        if (dx * dx + dy * dy <= 250 * 250) n++;
      }
      if (n > most) {
        thickest = u;
        most = n;
      }
    }
    return thickest;
  }

  // The enemy ground units within range of (x, y)
  private enemies(x: number, y: number, range: number, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
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
}
