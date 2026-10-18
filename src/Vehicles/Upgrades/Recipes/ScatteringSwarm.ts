import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

// A horde of bats flies into the largest group and breaks apart there like a
// cluster of rockets, its 6 smaller swarms scattering through the group
export class ScatteringSwarm extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0A0");
  public readonly merchantItemTypeId = FourCC("I0A1");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly hordeAbilityId: number = FourCC("A044");
  private readonly swarmAbilityId: number = FourCC("A04V");

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
      const tx = target.x;
      const ty = target.y;
      const horde = Unit.create(owner, this.dummyUnitId, x, y);
      horde.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      horde.addAbility(this.hordeAbilityId);
      horde.issueOrderAt("carrionswarm", tx, ty);

      // It breaks apart when it reaches the group (the horde flies 1100 a second)
      const distance = Math.sqrt((tx - x) * (tx - x) + (ty - y) * (ty - y));
      const later = TimerUtils.newTimer();
      later.start(distance / 1100, false, () => {
        TimerUtils.releaseTimer(later);
        const offset = RandomNumberGenerator.random(0, 59);
        for (let i = 0; i < 6; i++) {
          const radians = (offset + 60 * i) * MULT;
          const swarm = Unit.create(owner, this.dummyUnitId, tx, ty);
          swarm.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
          swarm.addAbility(this.swarmAbilityId);
          swarm.issueOrderAt(
            "carrionswarm",
            tx + 100 * Math.cos(radians),
            ty + 100 * Math.sin(radians),
          );
        }
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
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
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
