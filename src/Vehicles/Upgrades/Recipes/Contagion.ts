import { Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// A wasting curse that cripples the enemy nearest the hero, then leaps on to
// the nearest enemy it has not had yet, 5 times. It grows stronger with every
// host, and leaps at once when its host dies
export class Contagion extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I04U");
  public readonly merchantItemTypeId = FourCC("I04V");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I04O")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");

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
      const host = this.nearest(owner, x, y, 600, new Set<number>());
      if (host == null) return;

      this.infect(owner, host, 0, new Set<number>());
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

  // The curse's hop-th host; it holds it for 0.6 seconds, or until it dies
  private infect(
    owner: MapPlayer,
    host: Unit,
    hop: number,
    infected: Set<number>,
  ): void {
    infected.add(host.id);
    const dummy = Unit.create(owner, this.dummyUnitId, host.x, host.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.crippleAbilityId);
    dummy.issueTargetOrder(OrderId.Cripple, host);
    dummy.damageTarget(
      host.handle,
      120 + 25 * hop,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    if (hop >= 5) return;

    let { x, y } = host;
    let held = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      held += 0.1;
      if (host.isAlive()) {
        x = host.x;
        y = host.y;
        if (held < 0.55) return;
      }

      TimerUtils.releaseTimer(t);
      const next = this.nearest(owner, x, y, 400, infected);
      if (next == null) return;

      const leap = AddLightningEx("DRAL", false, x, y, 60, next.x, next.y, 60);
      const fade = TimerUtils.newTimer();
      fade.start(0.25, false, () => {
        TimerUtils.releaseTimer(fade);
        DestroyLightning(leap);
      });
      this.infect(owner, next, hop + 1, infected);
    });
  }

  private nearest(
    owner: MapPlayer,
    x: number,
    y: number,
    range: number,
    infected: Set<number>,
  ): Unit | undefined {
    let best: Unit | undefined;
    let bestDistance = 0;
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (infected.has(u.id)) return;

      const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (best != null && distance >= bestDistance) return;
      best = u;
      bestDistance = distance;
    });
    grp.destroy();
    at.destroy();
    return best;
  }
}
