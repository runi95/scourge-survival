import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../../Utility/Globals";

export class OrbOfFire extends WeaponUpgrade {
  public readonly name = "Orb of Fire";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNOrbOfFire.blp";
  public readonly cost = 400;
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I00V");
  public readonly description = (
    level: number
  ) => `Shoots a fireball with splash damage at a random enemy unit within range.

Damage: |cffffcc00100|r
Cooldown: |cffffcc001.5s|r
Area of Effect (splash): |cffffcc00125|r
Range: |cffffcc00500|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00magic|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u00N");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(1, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
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
    _weaponIndex: number
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
