import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../../Utility/Globals";
import { Race } from "../../../../Game/Race";

const MULT = Math.PI / 180;

export class FrostWyrm extends WeaponUpgrade {
  public readonly name = "Frost Wyrm";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly race = Race.UNDEAD;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNFrostWyrm.blp";
  public readonly cost = 500;
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I05M");
  public readonly description = (
    level: number,
  ) => `Summons a Frost Wyrm every 60 seconds that fights by your side. Its frozen breath hits every enemy around its target and slows them.

Damage: |cffffcc0093 - 115|r
Slow: |cffffcc00-50% movement and attack speed for 10s|r
Cooldown: |cffffcc0060s|r
Area of effect: |cffffcc00200|r
Health: |cffffcc001350|r
Duration: |cffffcc0045s|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00magic|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly itemWyrms = new Map<number, Unit[]>();
  private readonly wyrmUnitTypeId: number = FourCC("u01R");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const summon = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const wyrms: Unit[] = [];
      for (let i = 0; i < 1; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = x + 200 * Math.cos(radians);
        const wy = y + 200 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FrostWyrm/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const wyrm = Unit.create(owner, this.wyrmUnitTypeId, wx, wy);
        wyrm.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 45);
        wyrms.push(wyrm);
      }
      this.itemWyrms.set(itemId, wyrms);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, summon);
    summon();
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

    const wyrms = this.itemWyrms.get(itemId);
    this.itemWyrms.delete(itemId);
    if (wyrms == null) return;
    for (const wyrm of wyrms) {
      if (wyrm.isAlive()) wyrm.kill();
    }
  }
}
