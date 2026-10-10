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

export class FeralSpirit extends WeaponUpgrade {
  public readonly name = "Feral Spirit";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly race = Race.ORC;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNSpiritWolf.blp";
  public readonly cost = 350;
  public readonly cooldown = 30;
  public readonly itemTypeId = FourCC("I05I");
  public readonly description = (
    level: number,
  ) => `Summons 2 Spirit Wolves every 30 seconds that fight by your side. Their attacks sometimes deal critical damage.

Damage: |cffffcc0016 - 17|r
Critical strike: |cffffcc0015% chance for x2 damage|r
Cooldown: |cffffcc0030s|r
Health: |cffffcc00350|r
Duration: |cffffcc0025s|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00normal|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly itemWolves = new Map<number, Unit[]>();
  private readonly wolfUnitTypeId: number = FourCC("osw2");

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
      const wolves: Unit[] = [];
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = x + 150 * Math.cos(radians);
        const wy = y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const wolf = Unit.create(owner, this.wolfUnitTypeId, wx, wy);
        wolf.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 25);
        wolves.push(wolf);
      }
      this.itemWolves.set(itemId, wolves);
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

    const wolves = this.itemWolves.get(itemId);
    this.itemWolves.delete(itemId);
    if (wolves == null) return;
    for (const wolf of wolves) {
      if (wolf.isAlive()) wolf.kill();
    }
  }
}
