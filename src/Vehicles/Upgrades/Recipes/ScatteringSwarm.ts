import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

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
      const { x, y } = vehicle.unit;
      const wander = RandomNumberGenerator.random(0, 359) * MULT;
      const tx = target != null ? target.x : x + 500 * Math.cos(wander);
      const ty = target != null ? target.y : y + 500 * Math.sin(wander);
      const flight = Math.max(
        300,
        Math.sqrt((tx - x) * (tx - x) + (ty - y) * (ty - y)) + 100,
      );
      const horde = Unit.create(owner, this.dummyUnitId, x, y);
      horde.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      horde.addAbility(this.hordeAbilityId);
      BlzSetAbilityRealLevelField(
        horde.getAbility(this.hordeAbilityId),
        ABILITY_RLF_DISTANCE_UCS3,
        0,
        flight,
      );
      horde.issueOrderAt("carrionswarm", tx, ty);

      const heading = Math.atan2(ty - y, tx - x);
      const ex = x + flight * Math.cos(heading);
      const ey = y + flight * Math.sin(heading);
      const later = TimerUtils.newTimer();
      later.start(flight / 1100, false, () => {
        TimerUtils.releaseTimer(later);
        const offset = RandomNumberGenerator.random(0, 59);
        for (let i = 0; i < 6; i++) {
          const radians = (offset + 60 * i) * MULT;
          const swarm = Unit.create(owner, this.dummyUnitId, ex, ey);
          swarm.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
          swarm.addAbility(this.swarmAbilityId);
          swarm.issueOrderAt(
            "carrionswarm",
            ex + 100 * Math.cos(radians),
            ey + 100 * Math.sin(radians),
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
