import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { Globals } from "../../../Utility/Globals";
import { WeaponUpgrade } from "../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";

export class LiquidFire extends WeaponUpgrade {
  public readonly name = "Breath of Fire";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNLiquidFire.blp";
  public readonly cost = 200;
  public readonly cooldown = 0.5;
  public readonly itemTypeId = FourCC("I00P");
  public readonly description = (
    level: number
  ) => `Leaves a trail of fire that burns enemies behind you whenever your hero moves around.

Damage: |cffffcc0010|r
Cooldown: |cffffcc001s|r
Area of effect: |cffffcc00125|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly unitPositions = new Map<number, [number, number]>();

  private readonly dummyUnitId: number = FourCC("u00D");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    this.unitPositions.set(itemId, [vehicle.unit.x, vehicle.unit.y]);
    t.start(0.5, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );
      const unitPosition = this.unitPositions.get(itemId);
      if (unitPosition == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      const [prevX, prevY] = unitPosition;
      const dist = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
      if (dist < 50) return;

      unitPosition[0] = x;
      unitPosition[1] = y;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 10);
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
    this.unitPositions.delete(itemId);
  }
}
