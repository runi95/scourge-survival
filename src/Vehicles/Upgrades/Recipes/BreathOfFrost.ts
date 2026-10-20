import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class BreathOfFrost extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I0AY");
  public readonly merchantItemTypeId = FourCC("I0AZ");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly breathAbilityId: number = FourCC("A04Y");

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
      const wander = (RandomNumberGenerator.random(0, 359) * Math.PI) / 180;
      const tx = target != null ? target.x : x + 500 * Math.cos(wander);
      const ty = target != null ? target.y : y + 500 * Math.sin(wander);
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 6);
      dummy.addAbility(this.breathAbilityId);
      dummy.issueOrderAt("breathoffrost", tx, ty);
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
