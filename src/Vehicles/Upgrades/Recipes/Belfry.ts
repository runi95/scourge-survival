import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

interface Roosts {
  roosts: Unit[];
  // Roosts the bats have settled in, 3 seconds after they land
  settled: Set<Unit>;
}

// Bat roosts settle around the hero. When an enemy ground unit walks under
// one, every roost sends its bats at that enemy at once, so the swarms cross
// on it from wherever the roosts hang, and the roosts are empty
export class Belfry extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
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
    const belfry: Roosts = { roosts: [], settled: new Set<Unit>() };
    this.belfries.set(itemId, belfry);

    const place: Timer = TimerUtils.newTimer();
    this.placeTimers.set(itemId, place);
    place.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      belfry.roosts = belfry.roosts.filter((r) => r.isAlive());
      for (const roost of belfry.settled) {
        if (!roost.isAlive()) belfry.settled.delete(roost);
      }
      if (belfry.roosts.length >= this.maxRoosts) return;

      // On the side of a random enemy coming in, if there is one
      const { x, y } = vehicle.unit;
      const comer = this.comer(vehicle.unit, owner);
      const angle =
        comer != null
          ? Math.atan2(comer.y - y, comer.x - x) +
            RandomNumberGenerator.random(-30, 30) * (Math.PI / 180)
          : RandomNumberGenerator.random(0, 359) * (Math.PI / 180);
      const distance = RandomNumberGenerator.random(100, 250);
      const roost = Unit.create(
        owner,
        this.roostUnitTypeId,
        x + distance * Math.cos(angle),
        y + distance * Math.sin(angle),
      );
      roost.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
      belfry.roosts.push(roost);
      const settle = TimerUtils.newTimer();
      settle.start(3, false, () => {
        TimerUtils.releaseTimer(settle);
        if (roost.isAlive()) belfry.settled.add(roost);
      });
    });

    const watch: Timer = TimerUtils.newTimer();
    this.watchTimers.set(itemId, watch);
    watch.start(0.25, true, () => {
      for (const roost of belfry.settled) {
        if (!roost.isAlive()) continue;
        const intruder = this.intruder(roost, owner);
        if (intruder == null) continue;

        this.release(belfry, owner, roost, intruder, vehicle.unit);
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

  private comer(hero: Unit, owner: MapPlayer): Unit | undefined {
    const comers: Unit[] = [];
    const grp = Group.fromRange(800, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      comers.push(u);
    });
    grp.destroy();
    if (comers.length === 0) return undefined;
    return comers[RandomNumberGenerator.random(0, comers.length - 1)];
  }

  private intruder(roost: Unit, owner: MapPlayer): Unit | undefined {
    let intruder: Unit | undefined;
    const grp = Group.fromRange(100, roost.point);
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

  private release(
    belfry: Roosts,
    owner: MapPlayer,
    stirred: Unit,
    intruder: Unit,
    hero: Unit,
  ): void {
    const { x, y } = intruder;
    for (const roost of belfry.roosts) {
      if (!roost.isAlive()) continue;
      // The roost it walked under sends its bats on past it, towards the
      // hero
      const dx = roost === stirred ? hero.x - roost.x : x - roost.x;
      const dy = roost === stirred ? hero.y - roost.y : y - roost.y;
      const dummy = Unit.create(owner, this.dummyUnitId, roost.x, roost.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      dummy.addAbility(this.carrionSwarmAbilityId);
      dummy.issueOrderAt("carrionswarm", roost.x + dx, roost.y + dy);
      roost.destroy();
    }
    belfry.roosts = [];
    belfry.settled.clear();
  }
}
