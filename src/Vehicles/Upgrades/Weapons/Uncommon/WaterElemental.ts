import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../../Utility/Globals";

export class WaterElemental extends WeaponUpgrade {
  public readonly name = "Water Elemental";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNSummonWaterElemental.blp";
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I00M");
  public readonly cost = 250;
  public readonly description = (
    level: number
  ) => `Spawns a static Water Elemental that attacks nearby enemy units within range.

Damage: |cffffcc028 - 35|r
Cooldown: |cffffcc000.5s|r
Range: |cffffcc00500|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00piercing|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly waterElementalUnitTypeId: number = FourCC("h002");
  private readonly itemWaterElementalMap = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    this.itemIterations.set(itemId, 0);
    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations === 0) {
        const { x, y } = vehicle.unit;
        const waterElemental = Unit.create(
          owner,
          this.waterElementalUnitTypeId,
          x + RandomNumberGenerator.random(-150, 150),
          y + RandomNumberGenerator.random(-150, 150)
        );
        waterElemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
        this.itemWaterElementalMap.set(itemId, waterElemental);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 6) {
        this.itemWaterElementalMap.delete(itemId);
        return;
      } else if (iterations >= 7) {
        this.itemIterations.set(itemId, 0);
      }
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
    this.itemIterations.delete(itemId);

    const waterElemental = this.itemWaterElementalMap.get(itemId);
    if (waterElemental == null) return;

    waterElemental.kill();
  }
}
