import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// The Goblin Alchemist's Acid Bomb. Every 2 seconds a flask of acid is lobbed
// at the heart of the largest group within 800 that isn't doused yet. Every
// enemy within 250 of where it lands loses 4 armor, is slowed by 25% and
// burns for 15 a second (25 the one hit) for 6 seconds
export class AcidBomb extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0DI");
  public readonly merchantItemTypeId = FourCC("I0DJ");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A057");
  private readonly buffId: number = FourCC("BNab");

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
      const target = this.largestGroup(hero, owner);
      if (target == null) return;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      // It outlives the acid, which burns in its name
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 9);
      dummy.addAbility(this.abilityId);
      dummy.issueTargetOrder("acidbomb", target);
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

  // The enemy within 800 of the hero with the most undoused enemies within
  // 250 of it; doused enemies only count when nobody is undoused
  private largestGroup(hero: Unit, owner: MapPlayer): Unit | undefined {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(800, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - u.x;
        const dy = other.y - u.y;
        if (dx * dx + dy * dy > 250 * 250) continue;
        count += other.getAbilityLevel(this.buffId) > 0 ? 0.01 : 1;
      }
      if (count <= most) continue;
      most = count;
      best = u;
    }
    return best;
  }
}
