import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Roosts {
  roosts: Unit[];
  ready: boolean;
}

// Bat roosts pile up underneath the hero. When an enemy ground unit steps on
// any of them, every roost sends its bats at that enemy at once, so the
// swarms cross on it from wherever the roosts lie
export class Belfry extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I09Y");
  public readonly merchantItemTypeId = FourCC("I09Z");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I05L")];

  private readonly placeTimers = new Map<number, Timer>();
  private readonly watchTimers = new Map<number, Timer>();
  private readonly belfries = new Map<number, Roosts>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly carrionSwarmAbilityId: number = FourCC("A044");
  private readonly roostUnitTypeId: number = FourCC("n01C");
  private readonly maxRoosts = 5;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const belfry: Roosts = { roosts: [], ready: true };
    this.belfries.set(itemId, belfry);

    const place: Timer = TimerUtils.newTimer();
    this.placeTimers.set(itemId, place);
    place.start(4, true, () => {
      belfry.roosts = belfry.roosts.filter((r) => r.isAlive());
      // The oldest roost makes way once there are enough
      if (belfry.roosts.length >= this.maxRoosts) belfry.roosts.shift().kill();

      const { x, y } = vehicle.unit;
      const roost = Unit.create(owner, this.roostUnitTypeId, x, y);
      roost.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      belfry.roosts.push(roost);
    });

    const watch: Timer = TimerUtils.newTimer();
    this.watchTimers.set(itemId, watch);
    watch.start(0.25, true, () => {
      if (!belfry.ready) return;

      for (const roost of belfry.roosts) {
        if (!roost.isAlive()) continue;
        const intruder = this.intruder(roost, owner);
        if (intruder == null) continue;

        this.release(belfry, owner, intruder);
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        return;
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
    TimerUtils.releaseTimer(this.placeTimers.get(itemId));
    this.placeTimers.delete(itemId);
    TimerUtils.releaseTimer(this.watchTimers.get(itemId));
    this.watchTimers.delete(itemId);

    const belfry = this.belfries.get(itemId);
    this.belfries.delete(itemId);
    for (const roost of belfry?.roosts ?? []) {
      if (roost.isAlive()) roost.kill();
    }
  }

  private intruder(roost: Unit, owner: MapPlayer): Unit | undefined {
    let intruder: Unit | undefined;
    const grp = Group.fromRange(200, roost.point);
    grp.for((u) => {
      if (intruder != null) return;
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      intruder = u;
    });
    grp.destroy();
    return intruder;
  }

  private release(belfry: Roosts, owner: MapPlayer, intruder: Unit): void {
    belfry.ready = false;
    const t = TimerUtils.newTimer();
    t.start(this.cooldown, false, () => {
      TimerUtils.releaseTimer(t);
      belfry.ready = true;
    });

    const { x, y } = intruder;
    for (const roost of belfry.roosts) {
      if (!roost.isAlive()) continue;
      // A roost right on top of it sends its bats on through
      let dx = x - roost.x;
      let dy = y - roost.y;
      if (dx * dx + dy * dy < 50 * 50) {
        const angle = (roost.facing * Math.PI) / 180;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      }
      const dummy = Unit.create(owner, this.dummyUnitId, roost.x, roost.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      dummy.addAbility(this.carrionSwarmAbilityId);
      dummy.issueOrderAt("carrionswarm", roost.x + dx, roost.y + dy);
    }
  }
}
