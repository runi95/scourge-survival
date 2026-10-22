import { Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

// A crack of ice spikes races towards the largest group and forks every 120,
// 40 degrees to either side, 3 times: cracks spreading out like in a frozen
// lake. Every enemy ground unit a crack runs through is tossed and chilled
export class Fracture extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0B8");
  public readonly merchantItemTypeId = FourCC("I0B9");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  // Impale, 120 long
  private readonly crackAbilityId: number = FourCC("A050");
  private readonly chillAbilityId: number = FourCC("A04W");

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
      this.crack(owner, x, y, Math.atan2(target.y - y, target.x - x), 4);
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

  // One 120 long stretch; it forks at its end while it has forks left
  private crack(
    owner: MapPlayer,
    x: number,
    y: number,
    angle: number,
    left: number,
  ): void {
    const toX = x + 120 * Math.cos(angle);
    const toY = y + 120 * Math.sin(angle);
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    dummy.addAbility(this.crackAbilityId);
    dummy.issueOrderAt("impale", toX, toY);

    const t = TimerUtils.newTimer();
    t.start(0.25, false, () => {
      TimerUtils.releaseTimer(t);
      this.chill(owner, x, y, toX, toY);
      if (left <= 1) return;

      this.crack(owner, toX, toY, angle - 40 * MULT, left - 1);
      this.crack(owner, toX, toY, angle + 40 * MULT, left - 1);
    });
  }

  // Every enemy ground unit within 100 of the stretch
  private chill(
    owner: MapPlayer,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): void {
    const at = Point.create((ax + bx) / 2, (ay + by) / 2);
    const grp = Group.fromRange(160, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      const along = Math.max(
        0,
        Math.min(
          1,
          ((u.x - ax) * (bx - ax) + (u.y - ay) * (by - ay)) / (120 * 120),
        ),
      );
      const ox = u.x - (ax + along * (bx - ax));
      const oy = u.y - (ay + along * (by - ay));
      if (ox * ox + oy * oy > 100 * 100) return;

      const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.chillAbilityId);
      dummy.issueTargetOrder("slow", u);
    });
    grp.destroy();
    at.destroy();
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
        const dx = other.x - candidate.x;
        const dy = other.y - candidate.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= bestCount) continue;
      best = candidate;
      bestCount = count;
    }
    return best;
  }
}
