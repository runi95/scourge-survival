import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Charge {
  x: number;
  y: number;
  rocket: Effect;
}

interface Field {
  charges: Charge[];
  timers: Timer[];
  dropped: boolean;
}

// Every 1.5 seconds a rocket (0.4 s flight) that buries itself next to a
// random enemy ground unit within 700, up to 6 (the oldest goes off first).
// Every 4 seconds, with an enemy ground unit within 300 or a rocket buried, a
// stomp (A043: 90 within 300, 1.5 s stun) that sets every buried rocket off:
// 60 to every enemy ground unit within 175 of it, stunned for 0.5 s
export class SeismicCharges extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I090");
  public readonly merchantItemTypeId = FourCC("I091");
  public readonly recipe: number[] = [FourCC("I05H"), FourCC("I00N")];

  private readonly fields = new Map<number, Field>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly warStompAbilityId: number = FourCC("A043");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const field: Field = { charges: [], timers: [], dropped: false };
    this.fields.set(itemId, field);

    const rockets = TimerUtils.newTimer();
    rockets.start(1.5, true, () => {
      const hero = vehicle.unit;
      const enemies = this.enemies(hero.x, hero.y, 700, owner);
      if (enemies.length === 0) return;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const tx = target.x + RandomNumberGenerator.random(-75, 75);
      const ty = target.y + RandomNumberGenerator.random(-75, 75);
      this.fire(vehicle.unit, owner, field, tx, ty);
    });

    const stomp = TimerUtils.newTimer();
    stomp.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const near = this.enemies(hero.x, hero.y, 300, owner).length > 0;
      if (!near && field.charges.length === 0) return;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.warStompAbilityId);
      dummy.issueImmediateOrder("stomp");
      while (field.charges.length > 0) {
        this.blow(hero, owner, field.charges.shift());
      }
    });
    field.timers.push(rockets, stomp);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const field = this.fields.get(itemId);
    this.fields.delete(itemId);
    if (field == null) return;
    field.dropped = true;
    for (const t of field.timers) TimerUtils.releaseTimer(t);
    field.timers.length = 0;
    for (const charge of field.charges) charge.rocket.destroy();
    field.charges.length = 0;
  }

  // A rocket flies from the hero and buries itself at (tx, ty)
  private fire(
    hero: Unit,
    owner: MapPlayer,
    field: Field,
    tx: number,
    ty: number,
  ) {
    const sx = hero.x;
    const sy = hero.y;
    const rocket = Effect.create(
      "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
      sx,
      sy,
    );
    rocket.setYaw(Atan2(ty - sy, tx - sx));
    let step = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      rocket.x = sx + ((tx - sx) * step) / 8;
      rocket.y = sy + ((ty - sy) * step) / 8;
      rocket.setHeight(20 + 200 * Math.sin((Math.PI * step) / 8));
      if (step < 8) return;
      TimerUtils.releaseTimer(t);
      rocket.setPitch(1.2);
      rocket.setHeight(10);
      if (field.dropped) {
        rocket.destroy();
        return;
      }
      if (field.charges.length >= 6)
        this.blow(hero, owner, field.charges.shift());
      field.charges.push({ x: tx, y: ty, rocket });
    });
  }

  private blow(hero: Unit, owner: MapPlayer, charge: Charge) {
    charge.rocket.destroy();
    Effect.create(
      "Abilities/Weapons/Mortar/MortarMissile.mdl",
      charge.x,
      charge.y,
    ).destroy();
    for (const u of this.enemies(charge.x, charge.y, 175, owner)) {
      hero.damageTarget(
        u.handle,
        60,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) StunUtils.stunUnit(u.handle, 0.5);
    }
  }

  // The enemy ground units within range of (x, y)
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
