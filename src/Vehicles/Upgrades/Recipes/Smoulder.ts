import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

type Quarry = {
  unit: Unit | undefined;
  // Embers smouldering in every enemy shot, with their fire
  embers: Map<Unit, number>;
  fires: Map<Unit, Effect>;
};

// The hero picks a quarry, the enemy with the most life within 800, and
// shoots it every second until it dies or gets away. A plain arrow deals 10.
// For 6 mana the arrow sears (20) and leaves an ember in the quarry that
// smoulders for the rest of its life, 5 a second per ember, up to 10 embers
export class Smoulder extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I0E0");
  public readonly merchantItemTypeId = FourCC("I0E1");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I04P")];

  private readonly timers = new Map<number, Timer[]>();
  private readonly quarries = new Map<number, Quarry>();
  private readonly arrowUnitId: number = FourCC("u01J");
  private readonly searingArrowUnitId: number = FourCC("u01K");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const quarry: Quarry = {
      unit: undefined,
      embers: new Map<Unit, number>(),
      fires: new Map<Unit, Effect>(),
    };
    this.quarries.set(itemId, quarry);

    const shoot = TimerUtils.newTimer();
    shoot.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (!this.isQuarry(hero, owner, quarry.unit)) {
        quarry.unit = this.biggest(hero, owner);
      }
      const target = quarry.unit;
      if (target == null) return;

      let unitId = this.arrowUnitId;
      if (hero.mana >= 6) {
        hero.mana -= 6;
        unitId = this.searingArrowUnitId;
        this.kindle(quarry, target);
      }
      const arrow = Unit.create(owner, unitId, hero.x, hero.y);
      arrow.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      arrow.issueTargetOrder("attack", target);
    });

    const burn = TimerUtils.newTimer();
    burn.start(1, true, () => {
      quarry.embers.forEach((count, u) => {
        if (!u.isAlive()) {
          this.douse(quarry, u);
          return;
        }
        vehicle.unit.damageTarget(
          u.handle,
          5 * count,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_FIRE,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
    });
    this.timers.set(itemId, [shoot, burn]);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    for (const t of this.timers.get(itemId) ?? []) TimerUtils.releaseTimer(t);
    this.timers.delete(itemId);
    const quarry = this.quarries.get(itemId);
    this.quarries.delete(itemId);
    if (quarry == null) return;
    quarry.embers.forEach((_count, u) => this.douse(quarry, u));
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    return (
      u.isAlive() &&
      u.isVisible(owner) &&
      u.isEnemy(owner) &&
      !u.isUnitType(UNIT_TYPE_STRUCTURE)
    );
  }

  // Still alive, seen and within 800
  private isQuarry(hero: Unit, owner: MapPlayer, u: Unit | undefined): boolean {
    if (u == null || !this.isVictim(u, owner)) return false;
    const dx = u.x - hero.x;
    const dy = u.y - hero.y;
    return dx * dx + dy * dy <= 800 * 800;
  }

  private biggest(hero: Unit, owner: MapPlayer): Unit | undefined {
    let best: Unit | undefined;
    let most = 0;
    const grp = Group.fromRange(800, hero.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (u.life <= most) return;
      most = u.life;
      best = u;
    });
    grp.destroy();
    return best;
  }

  private kindle(quarry: Quarry, u: Unit): void {
    const count = quarry.embers.get(u) ?? 0;
    if (count >= 10) return;
    quarry.embers.set(u, count + 1);
    const old = quarry.fires.get(u);
    if (old != null) old.destroy();
    const fire = Effect.createAttachment(
      "Abilities/Spells/Other/ImmolationRed/ImmolationRedDamage.mdl",
      u,
      "chest",
    );
    fire.scale = 0.6 + 0.06 * (count + 1);
    quarry.fires.set(u, fire);
  }

  private douse(quarry: Quarry, u: Unit): void {
    quarry.embers.delete(u);
    const fire = quarry.fires.get(u);
    quarry.fires.delete(u);
    if (fire != null) fire.destroy();
  }
}
