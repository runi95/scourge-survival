import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class FlameStrike extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I035");
  public readonly merchantItemTypeId = FourCC("I036");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I00V")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly flameStrikeAbilityId: number = FourCC("A02V");

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

      const { x, y } = vehicle.unit;
      let targetX: number;
      let targetY: number;
      const target = this.largestGroup(vehicle.unit, owner);
      if (target != null) {
        targetX = target.x;
        targetY = target.y;
      } else {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const distance = RandomNumberGenerator.random(0, 700);
        targetX = x + distance * Math.cos(radians);
        targetY = y + distance * Math.sin(radians);
      }

      const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 8);
      dummy.addAbility(this.flameStrikeAbilityId);
      dummy.issueOrderAt("flamestrike", targetX, targetY);
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
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

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
