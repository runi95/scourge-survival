import { Item, MapPlayer, Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../../Utility/Globals";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";

const MULT = Math.PI / 180;

export class Shockwave extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNShockWave.blp";
  public readonly cost = 150;
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I002");
  public readonly description = (
    level: number
  ) => `Sends 2 shockwaves in opposite directions.

Damage: |cffffcc0050|r
Cooldown: |cffffcc002.5s|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shockwaveAbilityId: number = FourCC("A00B");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(2.5, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const randomAngle = RandomNumberGenerator.random(0, 359);
      const radians = [randomAngle * MULT, ((randomAngle + 180) % 360) * MULT];
      for (let i = 0; i < 2; i++) {
        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
        dummy.addAbility(this.shockwaveAbilityId);

        dummy.issueOrderAt(
          "shockwave",
          x + 400 * Math.cos(radians[i]),
          y + 400 * Math.sin(radians[i])
        );
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
  }
}
