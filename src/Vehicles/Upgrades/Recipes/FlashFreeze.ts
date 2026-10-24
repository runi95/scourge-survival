import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Charge {
  unit: Unit;
  // Seconds until it is armed
  arming: number;
}

interface Chill {
  // Seconds left frozen
  frozen: number;
}

interface Field {
  charges: Charge[];
  // Every enemy frozen by this weapon, by how long it stays frozen
  chills: Map<Unit, Chill>;
  timers: Timer[];
}

// Every 2 seconds a frost charge (n016, 30 s) under the hero, up to 8 (the
// oldest goes). Armed 2 s later, it bursts when an enemy ground unit is within
// 220: that enemy is frozen for 2 s. An enemy frozen for less than 1 s
// freezes every enemy within 150 of it that isn't frozen (checked every
// 0.25 s). Every enemy takes 120 when it freezes and 120 when it thaws
export class FlashFreeze extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I07C");
  public readonly merchantItemTypeId = FourCC("I07D");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I05E")];

  private readonly fields = new Map<number, Field>();
  private readonly chargeUnitId: number = FourCC("n016");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const field: Field = { charges: [], chills: new Map(), timers: [] };
    this.fields.set(itemId, field);

    const lay = TimerUtils.newTimer();
    lay.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (field.charges.length >= 8) {
        const oldest = field.charges.shift();
        if (oldest.unit.isAlive()) oldest.unit.kill();
      }
      const unit = Unit.create(owner, this.chargeUnitId, hero.x, hero.y, 270);
      unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
      field.charges.push({ unit, arming: 2 });
    });

    const watch = TimerUtils.newTimer();
    watch.start(0.25, true, () => {
      const hero = vehicle.unit;
      for (let i = field.charges.length - 1; i >= 0; i--) {
        const charge = field.charges[i];
        if (!charge.unit.isAlive()) {
          field.charges.splice(i, 1);
          continue;
        }
        charge.arming -= 0.25;
        if (charge.arming > 0) continue;
        const prey = this.nearby(
          charge.unit.x,
          charge.unit.y,
          220,
          owner,
          field,
          true,
        );
        if (prey.length === 0) continue;

        field.charges.splice(i, 1);
        Effect.create(
          "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
          charge.unit.x,
          charge.unit.y,
        ).destroy();
        charge.unit.kill();
        this.freeze(hero, field, prey[0]);
      }

      // The cold spreads from the freshly frozen, then they thaw
      const spreading: Unit[] = [];
      const thawed: Unit[] = [];
      field.chills.forEach((chill, u) => {
        chill.frozen -= 0.25;
        if (chill.frozen <= 0 || !u.isAlive()) thawed.push(u);
        else if (chill.frozen > 1) spreading.push(u);
      });
      for (const u of spreading) {
        for (const v of this.nearby(u.x, u.y, 150, owner, field, false)) {
          this.freeze(hero, field, v);
        }
      }
      for (const u of thawed) {
        field.chills.delete(u);
        if (!u.isAlive()) continue;
        Effect.create(
          "Abilities/Spells/Undead/FrostArmor/FrostArmorDamage.mdl",
          u.x,
          u.y,
        ).destroy();
        hero.damageTarget(
          u.handle,
          120,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
    });
    field.timers.push(lay, watch);
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
    for (const t of field.timers) TimerUtils.releaseTimer(t);
    for (const charge of field.charges) {
      if (charge.unit.isAlive()) charge.unit.kill();
    }
    field.charges.length = 0;
  }

  private freeze(hero: Unit, field: Field, u: Unit) {
    field.chills.set(u, { frozen: 2 });
    hero.damageTarget(
      u.handle,
      120,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    if (u.isAlive()) StunUtils.freezeUnit(u, 2, false, false, false, false);
  }

  // Enemies within range that this weapon hasn't frozen, nearest first
  private nearby(
    x: number,
    y: number,
    range: number,
    owner: MapPlayer,
    field: Field,
    groundOnly: boolean,
  ): Unit[] {
    const found: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (groundOnly && u.isUnitType(UNIT_TYPE_FLYING)) return;
      if (field.chills.has(u)) return;

      found.push(u);
    });
    grp.destroy();
    at.destroy();
    found.sort(
      (a, b) =>
        (a.x - x) ** 2 + (a.y - y) ** 2 - (b.x - x) ** 2 - (b.y - y) ** 2,
    );
    return found;
  }
}
