import { Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

// A haunted flock of bats flies out to the largest group and hovers over it
// for 4 seconds, following it around, while spirits drop out of it onto a
// random enemy below 5 times a second
export class Haunting extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0C4");
  public readonly merchantItemTypeId = FourCC("I0C5");
  public readonly recipe: number[] = [FourCC("I02K"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly flockUnitTypeId: number = FourCC("u02K");
  private readonly spiritUnitTypeId: number = FourCC("u02L");

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
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const anchor = this.largestGroup(vehicle.unit, owner);
      if (anchor != null) this.haunt(owner, vehicle.unit, anchor);
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

  // The flock flies out from the hero, at most 2.5 seconds, then haunts the
  // group for 4 seconds, following the enemy it settled on while it lives.
  // A spirit drops out of it every 0.2 seconds
  private haunt(owner: MapPlayer, hero: Unit, anchor: Unit): void {
    const flock = Unit.create(owner, this.flockUnitTypeId, hero.x, hero.y);
    flock.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 8);
    let { x, y } = anchor;
    const at = Point.create(x, y);
    let flying = 0;
    let haunting = -1;
    const t = TimerUtils.newTimer();
    t.start(0.2, true, () => {
      if (anchor.isAlive()) {
        x = anchor.x;
        y = anchor.y;
      }
      const dx = x - flock.x;
      const dy = y - flock.y;
      if (dx * dx + dy * dy > 50 * 50) flock.issueOrderAt("move", x, y);
      if (haunting < 0) {
        flying += 0.2;
        if (dx * dx + dy * dy > 150 * 150 && flying < 2.5) return;
        haunting = 0;
      }

      haunting += 0.2;
      at.setPosition(flock.x, flock.y);
      const haunted: Unit[] = [];
      const grp = Group.fromRange(250, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        haunted.push(u);
      });
      grp.destroy();
      if (haunted.length > 0) {
        const victim =
          haunted[RandomNumberGenerator.random(0, haunted.length - 1)];
        const spirit = Unit.create(
          owner,
          this.spiritUnitTypeId,
          flock.x,
          flock.y,
        );
        spirit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
        spirit.issueTargetOrder("attack", victim);
      }
      if (haunting < 4) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      flock.destroy();
    });
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(700, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      candidates.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let bestCount = 0;
    for (const candidate of candidates) {
      let count = 0;
      for (const other of candidates) {
        const distance = Math.sqrt(
          Math.pow(other.x - candidate.x, 2) +
            Math.pow(other.y - candidate.y, 2),
        );
        if (distance <= 250) count++;
      }

      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  }
}
