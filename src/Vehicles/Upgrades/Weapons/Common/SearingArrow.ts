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

export class SearingArrow extends WeaponUpgrade {
  public readonly name = "Searing Arrow";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly race = Race.NIGHT_ELF;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNSearingArrows.blp";
  public readonly cost = 75;
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I04P");
  public readonly description = (
    level: number,
  ) => `Fires a searing arrow at a nearby enemy unit.

Damage: |cffffcc0010 or 20 (with mana)|r
Cooldown: |cffffcc001.5s|r
Range: |cffffcc00600|r
Additional cost: |cffffcc008 mana|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00piercing|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly arrowUnitId: number = FourCC("u01J");
  private readonly searingArrowUnitId: number = FourCC("u01K");

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
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      // Only spend mana when there is something to shoot at
      if (enemies.length === 0) return;

      let unitId = this.arrowUnitId;
      if (vehicle.unit.mana >= 8) {
        vehicle.unit.mana -= 8;
        unitId = this.searingArrowUnitId;
      }

      const { x, y } = vehicle.unit;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const dummy = Unit.create(owner, unitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
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
