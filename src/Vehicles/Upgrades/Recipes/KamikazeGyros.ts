import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class KamikazeGyros extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I02R");
  public readonly merchantItemTypeId = FourCC("I02S");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly flyingMachineUnitTypeId: number = FourCC("h000");
  private readonly itemFlyingMachines = new Map<number, Unit[]>();
  private readonly itemIterations = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const flyingMachines: Unit[] = [];
    this.itemFlyingMachines.set(itemId, flyingMachines);
    for (let i = 0; i < 3; i++) {
      flyingMachines.push(this.takeOff(vehicle, owner));
    }

    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    this.itemIterations.set(itemId, 0);
    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations % 3 === 2) {
        this.dive(vehicle, owner, itemId, weaponIndex);
      }

      const { x, y } = vehicle.unit;
      for (const flyingMachine of flyingMachines) {
        const dist = Math.sqrt(
          Math.pow(flyingMachine.x - x, 2) + Math.pow(flyingMachine.y - y, 2),
        );
        flyingMachine.issueOrderAt(
          dist < 1000 ? "attack" : "move",
          x + RandomNumberGenerator.random(-250, 250),
          y + RandomNumberGenerator.random(-250, 250),
        );
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
    this.itemIterations.delete(itemId);

    const flyingMachines = this.itemFlyingMachines.get(itemId);
    this.itemFlyingMachines.delete(itemId);
    if (flyingMachines == null) return;

    for (const flyingMachine of flyingMachines) {
      flyingMachine.kill();
    }
  }

  private takeOff(vehicle: Vehicle, owner: MapPlayer): Unit {
    const { x, y } = vehicle.unit;
    const flyingMachine = Unit.create(
      owner,
      this.flyingMachineUnitTypeId,
      x + RandomNumberGenerator.random(-100, 100),
      y + RandomNumberGenerator.random(-100, 100),
    );
    flyingMachine.issueTargetOrder("patrol", vehicle.unit);

    return flyingMachine;
  }

  private dive(
    vehicle: Vehicle,
    owner: MapPlayer,
    itemId: number,
    weaponIndex: number,
  ): void {
    const flyingMachines = this.itemFlyingMachines.get(itemId);
    if (flyingMachines == null || flyingMachines.length === 0) return;

    const target = this.randomEnemy(vehicle.unit, owner);
    if (target == null) return;

    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    const flyingMachine = flyingMachines.shift();
    let targetX = target.x;
    let targetY = target.y;
    flyingMachine.issueOrderAt("move", targetX, targetY);

    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      elapsed += 0.1;
      if (target.isAlive()) {
        targetX = target.x;
        targetY = target.y;
        flyingMachine.issueOrderAt("move", targetX, targetY);
      }

      const dist = Math.sqrt(
        Math.pow(flyingMachine.x - targetX, 2) +
          Math.pow(flyingMachine.y - targetY, 2),
      );
      if (dist > 75 && elapsed < 3) return;

      TimerUtils.releaseTimer(t);
      this.crash(vehicle.unit, owner, flyingMachine.x, flyingMachine.y);
      flyingMachine.kill();

      if (this.itemFlyingMachines.get(itemId) === flyingMachines) {
        flyingMachines.push(this.takeOff(vehicle, owner));
      }
    });
  }

  private crash(source: Unit, owner: MapPlayer, x: number, y: number): void {
    Effect.create(
      "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
      x,
      y,
    ).destroy();

    const loc = Point.create(x, y);
    const grp = Group.fromRange(250, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      source.damageTarget(
        u.handle,
        250,
        false,
        false,
        ATTACK_TYPE_SIEGE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    loc.destroy();
  }

  private randomEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(800, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();

    if (enemies.length === 0) return undefined;
    return enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
  }
}
