import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// The hero burns every enemy close to it and every 3 seconds throws a poisoned
// dagger at the nearest enemy that isn't poisoned yet. A poisoned enemy in the flames
// runs a fever: it takes 40 more every second for as long as it keeps
// burning, even after the poison has worn off
export class Fever extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0DY");
  public readonly merchantItemTypeId = FourCC("I0DZ");
  public readonly recipe: number[] = [FourCC("I05Q"), FourCC("I005")];

  private readonly timers = new Map<number, Timer>();
  private readonly flames = new Map<number, Effect>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shadowStrikeAbilityId: number = FourCC("A047");

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

    // Seconds of poison (or fever) left on each poisoned enemy; burning keeps
    // it at 9
    const poisoned = new Map<number, { unit: Unit; left: number }>();
    let ticks = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(1, true, () => {
      const hero = vehicle.unit;
      const cured: number[] = [];
      for (const [id, poison] of poisoned) {
        poison.left -= 1;
        if (poison.left <= 0 || !poison.unit.isAlive()) cured.push(id);
      }
      for (const id of cured) poisoned.delete(id);

      const grp = Group.fromRange(220, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

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

        const poison = poisoned.get(u.id);
        if (!poison || !u.isAlive()) return;
        poison.left = 9;
        Effect.createAttachment(
          "Abilities/Spells/Other/ImmolationRed/ImmolationRedDamage.mdl",
          u,
          "chest",
        ).destroy();
        hero.damageTarget(
          u.handle,
          40,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();

      ticks++;
      if (ticks % this.cooldown !== 0) return;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const target = this.pickTarget(hero, owner, poisoned);
      if (!target) return;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
      dummy.addAbility(this.shadowStrikeAbilityId);
      dummy.issueTargetOrder("shadowstrike", target);
      poisoned.set(target.id, { unit: target, left: 9 });
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
  }

  // The nearest enemy within 700 that isn't poisoned yet (the nearest enemy
  // when all are)
  private pickTarget(
    hero: Unit,
    owner: MapPlayer,
    poisoned: Map<number, { unit: Unit; left: number }>,
  ): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestHealthy: Unit | undefined;
    let best = 0;
    let bestHealthy = 0;
    const grp = Group.fromRange(700, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      const d = dx * dx + dy * dy;
      if (!nearest || d < best) {
        nearest = u;
        best = d;
      }
      if (poisoned.has(u.id)) return;
      if (!nearestHealthy || d < bestHealthy) {
        nearestHealthy = u;
        bestHealthy = d;
      }
    });
    grp.destroy();

    return nearestHealthy ?? nearest;
  }
}
