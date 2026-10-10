import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { Globals } from "../../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { Group } from "../../../../Utility/Group";
import { Race } from "../../../../Game/Race";

export class Demolisher extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly race = Race.ORC;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNDemolisher.blp";
  public readonly cost = 150;
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I05F");
  public readonly description = (
    level: number,
  ) => `Lobs a flaming boulder at a random enemy unit within range, crushing everything it lands on.

Damage: |cffffcc0045|r
Cooldown: |cffffcc003s|r
Range: |cffffcc00800|r
Area of effect: |cffffcc00150|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00siege|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u01P");

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
      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (enemies.length === 0) return;

      const { x, y } = vehicle.unit;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      dummy.issueTargetOrder("attack", target);
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
}
