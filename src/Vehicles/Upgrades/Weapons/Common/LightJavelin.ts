import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { Globals } from "../../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Race } from "../../../../Game/Race";

export class LightJavelin extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly race = Race.ORC;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNSteelRanged.blp";
  public readonly cost = 75;
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I02M");
  public readonly description = (
    level: number,
  ) => `Throws a light javelin at nearby enemey unit.

Damage: |cffffcc0019 - 23|r
Cooldown: |cffffcc002s|r
Range: |cffffcc00450|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00piercing|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u00X");

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
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
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
