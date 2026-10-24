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

interface Kennel {
  pups: Unit[];
  timers: Timer[];
  dropped: boolean;
}

// Every 6 seconds, with an enemy ground unit within 700, 6 wolves flying
// (0.5 s) each to within 75 of a random one of them. Each landing does 35 to
// every enemy ground unit within 125 and stuns it for 0.5 s, and leaves a pup
// (o007: 22 - 23, 15% x2 crit, 200 life) for 6 s
export class Unleashed extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I09A");
  public readonly merchantItemTypeId = FourCC("I09B");
  public readonly recipe: number[] = [FourCC("I05I"), FourCC("I00N")];

  private readonly kennels = new Map<number, Kennel>();
  private readonly pupUnitId: number = FourCC("o007");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const kennel: Kennel = { pups: [], timers: [], dropped: false };
    this.kennels.set(itemId, kennel);

    const t = TimerUtils.newTimer();
    t.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      for (let i = kennel.pups.length - 1; i >= 0; i--) {
        if (!kennel.pups[i].isAlive()) kennel.pups.splice(i, 1);
      }

      const enemies = this.enemies(hero.x, hero.y, 700, owner);
      if (enemies.length === 0) return;
      for (let i = 0; i < 6; i++) {
        const aim =
          enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
        const spread = RandomNumberGenerator.random(0, 359) * MULT;
        const d = RandomNumberGenerator.random(0, 75);
        this.loose(
          hero,
          owner,
          kennel,
          aim.x + d * Math.cos(spread),
          aim.y + d * Math.sin(spread),
        );
      }
    });
    kennel.timers.push(t);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const kennel = this.kennels.get(itemId);
    this.kennels.delete(itemId);
    if (kennel == null) return;
    kennel.dropped = true;
    for (const t of kennel.timers) TimerUtils.releaseTimer(t);
    kennel.timers.length = 0;
    for (const pup of kennel.pups) {
      if (pup.isAlive()) pup.kill();
    }
    kennel.pups.length = 0;
  }

  // A wolf flies from the hero to (tx, ty) and lands there
  private loose(
    hero: Unit,
    owner: MapPlayer,
    kennel: Kennel,
    tx: number,
    ty: number,
  ) {
    const sx = hero.x;
    const sy = hero.y;
    const flier = Effect.create(
      "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
      sx,
      sy,
    );
    flier.setYaw(Atan2(ty - sy, tx - sx));
    let step = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      flier.x = sx + ((tx - sx) * step) / 10;
      flier.y = sy + ((ty - sy) * step) / 10;
      flier.setHeight(20 + 250 * Math.sin((Math.PI * step) / 10));
      if (step < 10) return;
      TimerUtils.releaseTimer(t);
      flier.destroy();
      if (kennel.dropped) return;

      Effect.create(
        "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
        tx,
        ty,
      ).destroy();
      for (const u of this.enemies(tx, ty, 125, owner)) {
        hero.damageTarget(
          u.handle,
          35,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (u.isAlive()) StunUtils.stunUnit(u.handle, 0.5);
      }
      const pup = Unit.create(owner, this.pupUnitId, tx, ty);
      pup.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 6);
      kennel.pups.push(pup);
    });
  }

  // The visible enemy ground units within range of (x, y)
  private enemies(x: number, y: number, range: number, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
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
