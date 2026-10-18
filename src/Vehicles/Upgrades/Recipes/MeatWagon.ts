import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Wagon {
  corpses: number;
  kills: number;
  landed: number;
}

// Lobs a volley of corpses into the largest group, like the Meat Wagon.
// Every enemy a volley kills is one more corpse for the next (up to 7); a
// volley that kills nothing leaves only 3
export class MeatWagon extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0C0");
  public readonly merchantItemTypeId = FourCC("I0C1");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    let corpses = 3;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const target = this.largestGroup(vehicle.unit, owner);
      if (target == null) return;

      const wagon: Wagon = { corpses, kills: 0, landed: 0 };
      const { x, y } = vehicle.unit;
      for (let i = 0; i < wagon.corpses; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const spread = i === 0 ? 0 : RandomNumberGenerator.random(50, 200);
        this.lob(
          owner,
          wagon,
          x,
          y,
          target.x + spread * Math.cos(radians),
          target.y + spread * Math.sin(radians),
          () => {
            corpses = wagon.kills > 0 ? Math.min(7, 3 + wagon.kills) : 3;
          },
        );
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
  }

  private lob(
    owner: MapPlayer,
    wagon: Wagon,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    // Called once the whole volley has landed
    done: () => void,
  ): void {
    const corpse = Effect.create(
      "Abilities/Weapons/MeatwagonMissile/MeatwagonMissile.mdl",
      fromX,
      fromY,
    );
    corpse.setYaw(Math.atan2(toY - fromY, toX - fromX));
    const distance = Math.sqrt(
      (toX - fromX) * (toX - fromX) + (toY - fromY) * (toY - fromY),
    );
    const flight = Math.max(0.4, distance / 800);
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      elapsed = Math.min(flight, elapsed + 0.03);
      const progress = elapsed / flight;
      corpse.x = fromX + (toX - fromX) * progress;
      corpse.y = fromY + (toY - fromY) * progress;
      corpse.setHeight(60 + distance * progress * (1 - progress));
      if (elapsed < flight) return;

      TimerUtils.releaseTimer(t);
      corpse.destroy();
      wagon.kills += this.splatter(owner, toX, toY);
      if (++wagon.landed === wagon.corpses) done();
    });
  }

  // Returns how many enemies it killed
  private splatter(owner: MapPlayer, x: number, y: number): number {
    Effect.create(
      "Objects/Spawnmodels/Undead/UndeadLargeDeathExplode/UndeadLargeDeathExplode.mdl",
      x,
      y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    let kills = 0;
    const grp = Group.fromRange(175, dummy.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        65,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) kills++;
    });
    grp.destroy();
    return kills;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    return true;
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(800, source.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;

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
