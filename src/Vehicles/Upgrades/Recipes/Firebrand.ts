import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

interface Brand {
  unit: Unit;
  left: number;
  effect: Effect;
}

// The hero burns every enemy close to it. Every 1.5 seconds it throws a
// poisoned spear at an enemy beyond the flames that isn't branded yet,
// branding it with fire for 8 seconds; the flames burn every branded enemy
// within 700 as if it stood in them
export class Firebrand extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I0D0");
  public readonly merchantItemTypeId = FourCC("I0D1");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I005")];

  private readonly timers = new Map<number, Timer>();
  private readonly flames = new Map<number, Effect>();
  private readonly brands = new Map<number, Map<number, Brand>>();
  private readonly spearUnitId: number = FourCC("u01S");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.flames.set(
      itemId,
      Effect.createAttachment(
        "Abilities/Spells/NightElf/Immolation/ImmolationTarget.mdl",
        vehicle.unit,
        "origin",
      ),
    );
    const brands = new Map<number, Brand>();
    this.brands.set(itemId, brands);

    // Every 0.5s: brands burn down, every 1s the flames burn, every 1.5s a
    // spear is thrown
    let ticks = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.5, true, () => {
      ticks++;
      const faded: number[] = [];
      for (const [id, brand] of brands) {
        brand.left -= 0.5;
        if (brand.left > 0 && brand.unit.isAlive()) continue;
        brand.effect.destroy();
        faded.push(id);
      }
      for (const id of faded) brands.delete(id);

      if (ticks % 2 === 0) this.burn(vehicle.unit, owner, brands);
      if (ticks % 3 === 0) {
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        this.throwSpear(vehicle.unit, owner, itemId, brands);
      }
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

    this.flames.get(itemId)?.destroy();
    this.flames.delete(itemId);

    for (const [, brand] of this.brands.get(itemId)) brand.effect.destroy();
    this.brands.delete(itemId);
  }

  // 20 to every enemy within 220 and every branded enemy within 700
  private burn(hero: Unit, owner: MapPlayer, brands: Map<number, Brand>) {
    const grp = Group.fromRange(700, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      if (dx * dx + dy * dy > 220 * 220 && !brands.has(u.id)) return;

      Effect.createAttachment(
        "Abilities/Spells/NightElf/Immolation/ImmolationDamage.mdl",
        u,
        "head",
      ).destroy();
      hero.damageTarget(
        u.handle,
        20,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }

  // A spear at a random enemy within 600 that isn't branded yet, beyond the
  // flames when there is one (any enemy when all are branded); the brand
  // takes when the spear lands
  private throwSpear(
    hero: Unit,
    owner: MapPlayer,
    itemId: number,
    brands: Map<number, Brand>,
  ): void {
    const enemies: Unit[] = [];
    const unbranded: Unit[] = [];
    const beyond: Unit[] = [];
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
      if (brands.has(u.id)) return;
      unbranded.push(u);
      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      if (dx * dx + dy * dy > 220 * 220) beyond.push(u);
    });
    grp.destroy();

    let pool = beyond.length > 0 ? beyond : unbranded;
    if (pool.length === 0) pool = enemies;
    if (pool.length === 0) return;

    const target = pool[RandomNumberGenerator.random(0, pool.length - 1)];
    const spear = Unit.create(owner, this.spearUnitId, hero.x, hero.y);
    spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    spear.issueTargetOrder("attack", target);

    const dx = target.x - hero.x;
    const dy = target.y - hero.y;
    const later: Timer = TimerUtils.newTimer();
    later.start(Math.sqrt(dx * dx + dy * dy) / 1200 + 0.1, false, () => {
      TimerUtils.releaseTimer(later);
      if (this.brands.get(itemId) !== brands) return;
      if (!target.isAlive()) return;

      const brand = brands.get(target.id);
      if (brand) {
        brand.left = 8;
        return;
      }
      brands.set(target.id, {
        unit: target,
        left: 8,
        effect: Effect.createAttachment(
          "Abilities/Spells/Other/Incinerate/IncinerateBuff.mdl",
          target,
          "chest",
        ),
      });
    });
  }
}
