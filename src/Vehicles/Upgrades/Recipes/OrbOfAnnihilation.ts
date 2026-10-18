import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// The Destroyer's Orb of Annihilation, lobbed at the largest group: it
// bounces on twice more, each time to the nearest enemy it has not blasted
// yet, blasting everything around every place it lands
export class OrbOfAnnihilation extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I0BQ");
  public readonly merchantItemTypeId = FourCC("I0BR");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");

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

      const target = this.largestGroup(vehicle.unit, owner);
      if (target == null) return;

      const { x, y } = vehicle.unit;
      this.lob(owner, x, y, target.x, target.y, 3, new Set<number>());
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

  // A hop to (toX, toY); after landing it bounces on, as long as it has
  // landings left
  private lob(
    owner: MapPlayer,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    landings: number,
    blasted: Set<number>,
  ): void {
    const orb = Effect.create(
      "Abilities/Spells/Undead/OrbOfDeath/AnnihilationMissile.mdl",
      fromX,
      fromY,
    );
    orb.scale = 1.5;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    orb.setYaw(angle);
    const distance = Math.sqrt(
      (toX - fromX) * (toX - fromX) + (toY - fromY) * (toY - fromY),
    );
    const flight = Math.max(0.3, distance / 900);
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      elapsed = Math.min(flight, elapsed + 0.03);
      const progress = elapsed / flight;
      orb.x = fromX + (toX - fromX) * progress;
      orb.y = fromY + (toY - fromY) * progress;
      orb.setHeight(40 + 4 * distance * 0.4 * progress * (1 - progress));
      if (elapsed < flight) return;

      TimerUtils.releaseTimer(t);
      orb.destroy();
      const next = this.blast(owner, toX, toY, blasted);
      if (landings <= 1) return;
      // To the nearest enemy it missed, else on in the same direction
      this.lob(
        owner,
        toX,
        toY,
        next != null ? next.x : toX + 250 * Math.cos(angle),
        next != null ? next.y : toY + 250 * Math.sin(angle),
        landings - 1,
        blasted,
      );
    });
  }

  // Returns the nearest enemy within 450 that no blast has hit yet
  private blast(
    owner: MapPlayer,
    x: number,
    y: number,
    blasted: Set<number>,
  ): Unit | undefined {
    Effect.create(
      "Abilities/Spells/Undead/OrbOfDeath/AnnihilationMissile.mdl",
      x,
      y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    let next: Unit | undefined;
    let nextDistance = 0;
    const grp = Group.fromRange(450, dummy.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (distance > 175 * 175) {
        if (blasted.has(u.id)) return;
        if (next != null && distance >= nextDistance) return;
        next = u;
        nextDistance = distance;
        return;
      }
      blasted.add(u.id);
      dummy.damageTarget(
        u.handle,
        70,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    return next;
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
        if (distance <= 200) count++;
      }

      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  }
}
