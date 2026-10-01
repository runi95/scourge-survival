import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Grave {
  unit: Unit;
  placedAt: number;
}

export class GraveTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I04E");
  public readonly merchantItemTypeId = FourCC("I04F");
  public readonly recipe: number[] = [FourCC("I001"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemGraves = new Map<number, Grave[]>();
  private readonly itemElapsed = new Map<number, number>();
  private readonly graveUnitTypeId: number = FourCC("u01B");
  private readonly skeletonUnitTypeId: number = FourCC("u01A");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const graves = this.itemGraves.get(itemId) ?? [];
    this.itemGraves.set(itemId, graves);
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.25, true, () => {
      const elapsed = (this.itemElapsed.get(itemId) ?? 0) + 0.25;
      this.itemElapsed.set(itemId, elapsed);

      for (let i = graves.length - 1; i >= 0; i--) {
        const grave = graves[i];
        const age = elapsed - grave.placedAt;
        if (age >= 180) {
          grave.unit.destroy();
          graves.splice(i, 1);
        } else if (age >= 3 && this.isEnemyNear(grave.unit, owner)) {
          this.raiseSkeletons(owner, grave.unit.x, grave.unit.y);
          grave.unit.kill();
          graves.splice(i, 1);
        }
      }

      if (elapsed % this.cooldown !== 0) return;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const { x, y } = vehicle.unit;
      graves.push({
        unit: Unit.create(owner, this.graveUnitTypeId, x, y),
        placedAt: elapsed,
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

    const graves = this.itemGraves.get(itemId);
    this.itemGraves.delete(itemId);
    this.itemElapsed.delete(itemId);
    if (graves == null) return;

    for (const grave of graves) {
      grave.unit.destroy();
    }
  }

  private isEnemyNear(grave: Unit, owner: MapPlayer): boolean {
    let found = false;
    const grp = Group.fromRange(200, grave.point);
    grp.for((u) => {
      if (found) return;
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      found = true;
    });
    grp.destroy();

    return found;
  }

  private raiseSkeletons(owner: MapPlayer, x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const sx = x + 60 * Math.cos(radians);
      const sy = y + 60 * Math.sin(radians);
      Effect.create(
        "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
        sx,
        sy,
      ).destroy();
      const skeleton = Unit.create(owner, this.skeletonUnitTypeId, sx, sy);
      skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
      skeleton.setAnimation("birth");
      skeleton.queueAnimation("stand");
    }
  }
}
