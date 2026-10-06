import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { OrderId } from "w3ts/globals/order";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

const MULT = Math.PI / 180;

export class PocketCyclone extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I022");
  public readonly merchantItemTypeId = FourCC("I023");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I00X")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemIterations = new Map<number, number>();
  private readonly cycloneUnitTypeId: number = FourCC("n00H");
  private readonly crowFormAbilityId: number = FourCC("Amrf");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    const existingIterations = this.itemIterations.get(itemId);
    if (existingIterations == null) {
      this.itemIterations.set(itemId, 30);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        30 - existingIterations,
      );
    }

    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 29) {
        this.itemIterations.set(itemId, iterations + 1);
        return;
      }

      this.itemIterations.set(itemId, 0);
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.spawnCyclone(vehicle, owner);
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

  private spawnCyclone(vehicle: Vehicle, owner: MapPlayer): void {
    const spawnAngle = RandomNumberGenerator.random(0, 359) * MULT;
    const cyclone = Unit.create(
      owner,
      this.cycloneUnitTypeId,
      vehicle.unit.x + 160 * Math.cos(spawnAngle),
      vehicle.unit.y + 160 * Math.sin(spawnAngle),
    );
    cyclone.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 45);
    cyclone.issueTargetOrder("move", vehicle.unit);

    const t = TimerUtils.newTimer();
    t.start(3, true, () => {
      if (!cyclone.isAlive()) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (cyclone.currentOrder !== OrderId.Move) {
        cyclone.issueTargetOrder("move", vehicle.unit);
      }

      const grp = Group.fromRange(300, cyclone.point);
      let hasStruck = false;
      grp.for((u) => {
        if (hasStruck) return;
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hasStruck = true;
        this.flingUnit(u, cyclone);
      });
      grp.destroy();
    });
  }

  private flingUnit(unit: Unit, cyclone: Unit): void {
    StunUtils.stunUnit(unit.handle, 1.5);
    const baseHeight = unit.getflyHeight();
    if (unit.addAbility(this.crowFormAbilityId)) {
      unit.removeAbility(this.crowFormAbilityId);
    }

    const effect = Effect.createAttachment(
      "Abilities/Spells/NightElf/Cyclone/CycloneTarget.mdl",
      unit,
      "origin",
    );
    let ticks = 48;
    let damageTicks = 8;
    let angle = Math.atan2(unit.y - cyclone.y, unit.x - cyclone.x);
    const startRadius = Math.sqrt(
      Math.pow(unit.x - cyclone.x, 2) + Math.pow(unit.y - cyclone.y, 2),
    );
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      if (!cyclone.isAlive()) {
        this.endFling(unit, effect, baseHeight, 0, cyclone, false);
        TimerUtils.releaseTimer(t);
        return;
      }

      if (!unit.isAlive()) {
        this.endFling(unit, effect, baseHeight, 0, cyclone, true);
        TimerUtils.releaseTimer(t);
        return;
      }

      const pull = Math.min(1, (48 - ticks) * 0.104166666667);
      const radius = startRadius + (90 - startRadius) * pull;
      angle += -0.0833333333333 * Math.PI;

      unit.x = cyclone.x + radius * Math.cos(angle);
      unit.y = cyclone.y + radius * Math.sin(angle);
      BlzSetUnitFacingEx(unit.handle, (angle - Math.PI / 2) * bj_RADTODEG);
      unit.setflyHeight(
        baseHeight +
          180 * Math.sin(Math.PI * Math.min(1, (48 - ticks) * 0.0208333333333)),
        0,
      );

      if (--damageTicks <= 0) {
        cyclone.damageTarget(
          unit.handle,
          104,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        damageTicks = 8;
      }

      if (--ticks <= 0) {
        this.endFling(unit, effect, baseHeight, 0, cyclone, true);
        TimerUtils.releaseTimer(t);
      }
    });
  }

  private endFling(
    unit: Unit,
    effect: Effect,
    baseHeight: number,
    angle: number,
    cyclone: Unit,
    thrown: boolean,
  ): void {
    effect.destroy();
    if (!unit.isAlive()) return;

    unit.setflyHeight(baseHeight, 0);
    if (!thrown) return;

    const flying = unit.isUnitType(UNIT_TYPE_FLYING);
    for (let d = 250; d > 0; d -= 50) {
      const x = cyclone.x + d * Math.cos(angle);
      const y = cyclone.y + d * Math.sin(angle);
      if (flying || !IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) {
        unit.x = x;
        unit.y = y;
        return;
      }
    }
  }
}
