import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Two of Maiev's Watchers shadow the hero unseen and guard its back. An enemy
// that comes within 600 of the hero from behind or the side (more than 60
// degrees from where it faces) is struck from the shadows: a Watcher appears
// behind it, stabs it in the back with a poisoned dagger and fades. With
// nobody there, they slip round the crowd and stab the one at its back. Each
// Watcher strikes every 3 seconds at most
export class Watchers extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0D4");
  public readonly merchantItemTypeId = FourCC("I0D5");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shadowStrikeAbilityId: number = FourCC("A047");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    // When each Watcher can strike again, and when each enemy's poison ends
    const ready = [0, 0];
    const poisoned = new Map<number, number>();
    let elapsed = 0;

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.25, true, () => {
      elapsed += 0.25;
      const watcher = ready[0] <= elapsed ? 0 : ready[1] <= elapsed ? 1 : -1;
      if (watcher < 0) return;

      const hero = vehicle.unit;
      const target = this.pickTarget(hero, owner, poisoned, elapsed);
      if (target == null) return;

      ready[watcher] = elapsed + this.cooldown;
      poisoned.set(target.id, elapsed + 9);
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        Math.min(ready[0], ready[1]) - elapsed,
      );
      this.strike(owner, hero, target);
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

  // The nearest enemy within 600 behind or beside the hero; with nobody there,
  // the one at the back of the crowd (the farthest within 600). Enemies that
  // aren't poisoned yet come first
  private pickTarget(
    hero: Unit,
    owner: MapPlayer,
    poisoned: Map<number, number>,
    elapsed: number,
  ): Unit | undefined {
    const facing = hero.facing * bj_DEGTORAD;
    const fx = Math.cos(facing);
    const fy = Math.sin(facing);
    let best: Unit | undefined;
    let bestRank = 4;
    let bestDistance = 0;
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      const d = dx * dx + dy * dy;
      // Within 60 degrees of where the hero faces: it sees that one coming
      const inFront = dx * fx + dy * fy > 0.5 * Math.sqrt(d);
      const rank =
        (inFront ? 2 : 0) + ((poisoned.get(u.id) ?? 0) > elapsed ? 1 : 0);
      if (rank > bestRank) return;
      if (
        rank === bestRank &&
        (inFront ? d <= bestDistance : d >= bestDistance)
      )
        return;

      best = u;
      bestRank = rank;
      bestDistance = d;
    });
    grp.destroy();
    return best;
  }

  // A Watcher steps out of the shadows behind the enemy and stabs it in the
  // back for 100 with a poisoned dagger (A047: 100 + 30 every 3 seconds for 9
  // seconds, fading slow), then fades
  private strike(owner: MapPlayer, hero: Unit, target: Unit): void {
    const angle = Math.atan2(target.y - hero.y, target.x - hero.x);
    const x = target.x + 60 * Math.cos(angle);
    const y = target.y + 60 * Math.sin(angle);
    Effect.create(
      "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
      x,
      y,
    ).destroy();
    const watcher = Effect.create(
      "Units/NightElf/HeroWarden/HeroWarden.mdl",
      x,
      y,
    );
    watcher.setYaw(angle + Math.PI);
    watcher.setAlpha(160);
    watcher.playAnimation(ANIM_TYPE_ATTACK);

    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
    dummy.addAbility(this.shadowStrikeAbilityId);
    dummy.issueTargetOrder("shadowstrike", target);
    dummy.damageTarget(
      target.handle,
      100,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );

    const later = TimerUtils.newTimer();
    later.start(0.6, false, () => {
      TimerUtils.releaseTimer(later);
      Effect.create(
        "Abilities/Spells/NightElf/Blink/BlinkCaster.mdl",
        watcher.x,
        watcher.y,
      ).destroy();
      // Hidden first, so it doesn't play its death
      watcher.setAlpha(0);
      watcher.destroy();
    });
  }
}
