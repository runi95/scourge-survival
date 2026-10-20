import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class MeatWagon extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0C0");
  public readonly merchantItemTypeId = FourCC("I0C1");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly wagonUnitTypeId: number = FourCC("u02G");

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
      const side = Math.atan2(target.y - y, target.x - x) + Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const spread = i === 0 ? 0 : RandomNumberGenerator.random(50, 200);
        const tx = target.x + spread * Math.cos(radians);
        const ty = target.y + spread * Math.sin(radians);
        const wx = x + 120 * (i - 1) * Math.cos(side);
        const wy = y + 120 * (i - 1) * Math.sin(side);
        const wagon = Unit.create(
          owner,
          this.wagonUnitTypeId,
          wx,
          wy,
          Math.atan2(ty - wy, tx - wx) / MULT,
        );
        wagon.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
        wagon.issueOrderAt("attackground", tx, ty);
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

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(800, source.point);
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
