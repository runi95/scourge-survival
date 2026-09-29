import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class CannonTower extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I02Z");
  public readonly merchantItemTypeId = FourCC("I030");
  public readonly recipe: number[] = [FourCC("I000"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly mineUnitTypeId: number = FourCC("n00N");

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
      const target = this.randomEnemy(vehicle.unit, owner);
      if (target == null) return;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const distance = RandomNumberGenerator.random(50, 100);
      this.fireMine(
        owner,
        vehicle.unit.x,
        vehicle.unit.y,
        target.x + distance * Math.cos(radians),
        target.y + distance * Math.sin(radians),
      );
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

  private fireMine(
    owner: MapPlayer,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    const missile = Effect.create(
      "Abilities/Weapons/Mortar/MortarMissile.mdl",
      fromX,
      fromY,
    );
    missile.setYaw(Math.atan2(toY - fromY, toX - fromX));

    const ground = Point.create(fromX, fromY);
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      const progress = Math.min(1, elapsed / 0.6);
      const mx = fromX + (toX - fromX) * progress;
      const my = fromY + (toY - fromY) * progress;
      ground.setPosition(mx, my);
      missile.setPosition(mx, my, ground.z + 1200 * progress * (1 - progress));

      if (progress < 1) return;

      TimerUtils.releaseTimer(t);
      ground.destroy();
      missile.destroy();
      const mine = Unit.create(owner, this.mineUnitTypeId, toX, toY);
      mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
    });
  }

  private randomEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(700, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      enemies.push(u);
    });
    grp.destroy();

    if (enemies.length === 0) return undefined;
    return enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
  }
}
