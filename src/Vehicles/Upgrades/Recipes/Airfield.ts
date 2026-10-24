import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Plane {
  unit: Unit;
  // Whom it is flying at, none while it is on the field or flying back
  target: Unit | undefined;
  returning: boolean;
  // Seconds of rearming left on the field
  rearming: number;
}

interface Base {
  field: Unit | undefined;
  planes: Plane[];
  // Seconds since the field was laid out, and since the last machine was built
  fieldAge: number;
  building: number;
  timer: Timer;
}

// An airfield (n01V) 250 from the hero, laid out again next to it every 30
// seconds. Every 4 seconds it builds a Flying Machine (n01W, no attack of its
// own), up to 4. A machine on the field flies at the farthest enemy within
// 1000 of the hero no other machine is after; within 100 of it the bomb does
// 90 to every enemy within 200, and the machine flies back to the field and
// rearms there for 1 second
export class Airfield extends WeaponUpgradeRecipe {
  public readonly cooldown = 30;
  public readonly itemTypeId = FourCC("I02P");
  public readonly merchantItemTypeId = FourCC("I02Q");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I00O")];

  private readonly bases = new Map<number, Base>();
  private readonly fieldUnitId: number = FourCC("n01V");
  private readonly planeUnitId: number = FourCC("n01W");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const base: Base = {
      field: undefined,
      planes: [],
      fieldAge: this.cooldown,
      building: 4,
      timer: TimerUtils.newTimer(),
    };
    this.bases.set(itemId, base);

    base.timer.start(0.25, true, () => {
      const hero = vehicle.unit;
      base.fieldAge += 0.25;
      if (base.field == null || base.fieldAge >= this.cooldown) {
        base.fieldAge = 0;
        hero.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        this.layOut(base, owner, hero);
      }
      const field = base.field;

      base.planes = base.planes.filter((p) => p.unit.isAlive());
      base.building += 0.25;
      if (base.planes.length < 4 && base.building >= 4) {
        base.building = 0;
        const unit = Unit.create(owner, this.planeUnitId, field.x, field.y);
        base.planes.push({
          unit,
          target: undefined,
          returning: false,
          rearming: 1,
        });
      }

      for (const plane of base.planes) this.fly(base, plane, owner, hero);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const base = this.bases.get(itemId);
    this.bases.delete(itemId);
    if (base == null) return;
    TimerUtils.releaseTimer(base.timer);
    for (const plane of base.planes) plane.unit.kill();
    if (base.field != null) base.field.kill();
  }

  // Next to the hero, somewhere the machines can land
  private layOut(base: Base, owner: MapPlayer, hero: Unit) {
    if (base.field != null) base.field.kill();
    const start = RandomNumberGenerator.random(0, 359);
    let x = hero.x;
    let y = hero.y;
    for (let i = 0; i < 12; i++) {
      const radians = (start + 30 * i) * MULT;
      x = hero.x + 250 * Math.cos(radians);
      y = hero.y + 250 * Math.sin(radians);
      if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) break;
    }
    base.field = Unit.create(owner, this.fieldUnitId, x, y, 270);
  }

  private fly(base: Base, plane: Plane, owner: MapPlayer, hero: Unit) {
    const field = base.field;
    const u = plane.unit;
    if (plane.returning) {
      const dx = field.x - u.x;
      const dy = field.y - u.y;
      if (dx * dx + dy * dy > 100 * 100) {
        u.issueOrderAt("move", field.x, field.y);
        return;
      }
      plane.returning = false;
      plane.rearming = 1;
      return;
    }

    if (plane.target == null) {
      plane.rearming -= 0.25;
      if (plane.rearming > 0) return;
      plane.target = this.farthest(base, owner, hero);
      if (plane.target == null) return;
    }

    const target = plane.target;
    if (!target.isAlive()) {
      plane.target = this.farthest(base, owner, hero);
      if (plane.target == null) plane.returning = true;
      return;
    }
    const dx = target.x - u.x;
    const dy = target.y - u.y;
    if (dx * dx + dy * dy > 100 * 100) {
      u.issueOrderAt("move", target.x, target.y);
      return;
    }

    this.bomb(owner, hero, target.x, target.y);
    plane.target = undefined;
    plane.returning = true;
    u.issueOrderAt("move", field.x, field.y);
  }

  private farthest(base: Base, owner: MapPlayer, hero: Unit): Unit | undefined {
    let target: Unit | undefined;
    let farthest = 0;
    const grp = Group.fromRange(1000, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (base.planes.some((p) => p.target === u)) return;

      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      if (dx * dx + dy * dy > farthest) {
        target = u;
        farthest = dx * dx + dy * dy;
      }
    });
    grp.destroy();
    return target;
  }

  private bomb(owner: MapPlayer, hero: Unit, x: number, y: number) {
    Effect.create(
      "Abilities/Weapons/GyroCopter/GyroCopterImpact.mdl",
      x,
      y,
    ).destroy();
    Effect.create(
      "Abilities/Weapons/SteamTank/SteamTankImpact.mdl",
      x,
      y,
    ).destroy();
    const at = Point.create(x, y);
    const grp = Group.fromRange(200, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      hero.damageTarget(
        u.handle,
        90,
        false,
        false,
        ATTACK_TYPE_SIEGE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    at.destroy();
  }
}
