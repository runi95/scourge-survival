import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../../Utility/Globals";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";

const MULT = Math.PI / 180;

export class Impale extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNImpale.blp";
  public readonly cost = 300;
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I001");
  public readonly description = (
    level: number
  ) => `Impales the ground in a random direction, hurting and stunning enemy units that are hit.

Damage: |cffffcc0075|r
Cooldown: |cffffcc001.5s|r
Range: |cffffcc00400|r
Stun duration: |cffffcc001s|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly impaleAbilityId: number = FourCC("A00A");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    t.start(1.5, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );
      const randomAngle = RandomNumberGenerator.random(0, 359);
      const radian = randomAngle * MULT;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.impaleAbilityId);

      dummy.issueOrderAt(
        "impale",
        x + 200 * Math.cos(radian),
        y + 200 * Math.sin(radian)
      );
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
