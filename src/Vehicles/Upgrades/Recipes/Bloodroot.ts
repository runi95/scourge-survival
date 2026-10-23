import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { BloodrootDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BloodrootDamageEvent";

interface Grove {
  // Seeds in every enemy struck, and seconds left before they wither
  seeds: Map<Unit, { count: number; left: number }>;
  timer: Timer;
}

// Every 0.6 seconds a poisoned spear (u01S: 15, -25% movement for 2s) at the
// nearest enemy within 600 that isn't rooted. Every spear that lands leaves a
// seed in it; the third seed in one enemy ground unit (each within 5s of the
// last) sprouts: it is rooted on the spot (A046: 50 a second for 2.5s, can't
// attack) and its seeds are spent. Rooted enemies are passed over, so the
// spears plant the front of the charge one after another
export class Bloodroot extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.6;
  public readonly itemTypeId = FourCC("I0EI");
  public readonly merchantItemTypeId = FourCC("I0EJ");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I05P")];

  private readonly groves = new Map<number, Grove>();
  private readonly spearUnitId: number = FourCC("u01S");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly rootsAbilityId: number = FourCC("A046");
  private readonly rootsBuffId: number = FourCC("BEer");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const grove: Grove = { seeds: new Map(), timer: TimerUtils.newTimer() };
    this.groves.set(itemId, grove);
    grove.timer.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      // Deleting inside forEach would end the loop there
      const withered: Unit[] = [];
      grove.seeds.forEach((seed, u) => {
        seed.left -= this.cooldown;
        if (seed.left <= 0 || !u.isAlive()) withered.push(u);
      });
      for (const u of withered) grove.seeds.delete(u);

      const target = this.pickTarget(hero, owner);
      if (target == null) return;
      const spear = Unit.create(owner, this.spearUnitId, hero.x, hero.y);
      spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      BloodrootDamageEvent.SPEARS.set(spear.id, (struck) =>
        this.seed(owner, grove, struck),
      );
      spear.issueTargetOrder("attack", target);
      // A spear that never lands is forgotten
      const forget = TimerUtils.newTimer();
      forget.start(3, false, () => {
        BloodrootDamageEvent.SPEARS.delete(spear.id);
        TimerUtils.releaseTimer(forget);
      });
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const grove = this.groves.get(itemId);
    this.groves.delete(itemId);
    if (grove == null) return;
    TimerUtils.releaseTimer(grove.timer);
    grove.seeds.clear();
  }

  private seed(owner: MapPlayer, grove: Grove, struck: Unit) {
    if (!struck.isAlive()) return;
    if (struck.isUnitType(UNIT_TYPE_FLYING)) return;
    if (struck.getAbilityLevel(this.rootsBuffId) > 0) return;

    const seed = grove.seeds.get(struck) ?? { count: 0, left: 5 };
    seed.count++;
    seed.left = 5;
    if (seed.count < 3) {
      grove.seeds.set(struck, seed);
      return;
    }

    // The poison takes root
    grove.seeds.delete(struck);
    Effect.create(
      "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
      struck.x,
      struck.y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitId, struck.x, struck.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
    dummy.addAbility(this.rootsAbilityId);
    dummy.issueTargetOrder("entanglingroots", struck);
  }

  // The nearest enemy within 600 that isn't rooted
  private pickTarget(hero: Unit, owner: MapPlayer): Unit | undefined {
    let nearest: Unit | undefined;
    let best = 0;
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.getAbilityLevel(this.rootsBuffId) > 0) return;

      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      const d = dx * dx + dy * dy;
      if (nearest == null || d < best) {
        nearest = u;
        best = d;
      }
    });
    grp.destroy();
    return nearest;
  }
}
