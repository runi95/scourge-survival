import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

interface Wire {
  a: Unit;
  b: Unit;
  lightning: lightning;
}

interface Field {
  mines: Unit[];
  wires: Wire[];
  check: Timer;
}

// Plants mines around the hero, each wired to the one before it. An enemy
// that crosses a wire trips over it: it is crippled and both mines on the
// wire blow up, snapping every other wire tied to them
export class Tripwire extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I050");
  public readonly merchantItemTypeId = FourCC("I051");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly fields = new Map<number, Field>();
  private readonly mineUnitTypeId: number = FourCC("n00Y");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const field: Field = { mines: [], wires: [], check: TimerUtils.newTimer() };
    this.fields.set(itemId, field);
    field.check.start(0.1, true, () => this.check(owner, field));

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const angle = RandomNumberGenerator.random(0, 359) * (Math.PI / 180);
      const distance = RandomNumberGenerator.random(150, 300);
      const mine = Unit.create(
        owner,
        this.mineUnitTypeId,
        vehicle.unit.x + distance * Math.cos(angle),
        vehicle.unit.y + distance * Math.sin(angle),
      );
      const last = field.mines[field.mines.length - 1];
      field.mines.push(mine);
      if (field.mines.length > 6) this.remove(field, field.mines[0]);
      if (last == null) return;

      const length = Math.sqrt(
        (mine.x - last.x) * (mine.x - last.x) +
          (mine.y - last.y) * (mine.y - last.y),
      );
      if (length > 600) return;
      field.wires.push({
        a: last,
        b: mine,
        lightning: this.string(last, mine),
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

    const field = this.fields.get(itemId);
    this.fields.delete(itemId);
    TimerUtils.releaseTimer(field.check);
    while (field.mines.length > 0) this.remove(field, field.mines[0]);
  }

  private check(owner: MapPlayer, field: Field): void {
    for (const wire of field.wires) {
      const tripper = this.tripper(owner, wire);
      if (tripper == null) continue;

      const dummy = Unit.create(
        owner,
        this.dummyUnitTypeId,
        tripper.x,
        tripper.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, tripper);
      const { a, b } = wire;
      this.explode(owner, a);
      this.explode(owner, b);
      this.remove(field, a);
      this.remove(field, b);
      // The wires changed; the rest are checked next time
      return;
    }
  }

  // The first enemy ground unit within 40 of the wire
  private tripper(owner: MapPlayer, wire: Wire): Unit | undefined {
    const ax = wire.a.x;
    const ay = wire.a.y;
    const dx = wire.b.x - ax;
    const dy = wire.b.y - ay;
    const lengthSquared = dx * dx + dy * dy;
    const at = Point.create(ax + dx / 2, ay + dy / 2);
    const grp = Group.fromRange(Math.sqrt(lengthSquared) / 2 + 40, at);
    let tripper: Unit | undefined;
    grp.for((u) => {
      if (tripper != null) return;
      if (!this.isVictim(u, owner)) return;

      const along =
        lengthSquared > 0
          ? Math.max(
              0,
              Math.min(1, ((u.x - ax) * dx + (u.y - ay) * dy) / lengthSquared),
            )
          : 0;
      const ox = u.x - (ax + along * dx);
      const oy = u.y - (ay + along * dy);
      if (ox * ox + oy * oy <= 40 * 40) tripper = u;
    });
    grp.destroy();
    at.destroy();
    return tripper;
  }

  private explode(owner: MapPlayer, mine: Unit): void {
    Effect.create(
      "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
      mine.x,
      mine.y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitTypeId, mine.x, mine.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    const grp = Group.fromRange(200, dummy.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        175,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }

  // Takes the mine away with every wire tied to it
  private remove(field: Field, mine: Unit): void {
    field.wires = field.wires.filter((wire) => {
      if (wire.a !== mine && wire.b !== mine) return true;
      DestroyLightning(wire.lightning);
      return false;
    });
    field.mines = field.mines.filter((m) => m !== mine);
    mine.destroy();
  }

  private string(a: Unit, b: Unit): lightning {
    const loc = Point.create(a.x, a.y);
    const az = loc.z;
    loc.setPosition(b.x, b.y);
    const bz = loc.z;
    loc.destroy();
    return AddLightningEx("LEAS", false, a.x, a.y, az + 20, b.x, b.y, bz + 20);
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }
}
