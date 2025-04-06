import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../../Utility/Globals";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { LongRifleDamageEvent } from "../../../../Utility/DamageEngine/DamageEvents/LongRifleDamageEvent";

export class LongRifle extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNDwarvenLongRifle.blp";
  public readonly cost = 300;
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I00Y");
  public readonly description = (
    level: number
  ) => `Fire off a long rifle, dealing damage based on distance to the target.

Damage: |cffffcc0075 - 750|r
Cooldown: |cffffcc005s|r
Range: |cffffcc001500|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00piercing|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly longRifleUnitTypeId: number = FourCC("u00O");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    LongRifleDamageEvent.READY_INSTANCES++;
    LongRifleDamageEvent.PLAYER_LONG_RIFLE_COUNT[owner.id]++;

    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown
    );

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(5, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );
      const dummy = Unit.create(owner, this.longRifleUnitTypeId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    LongRifleDamageEvent.READY_INSTANCES--;
    LongRifleDamageEvent.PLAYER_LONG_RIFLE_COUNT[owner.id]--;
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
