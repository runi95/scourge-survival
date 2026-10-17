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

export class Treants extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly race = Race.NIGHT_ELF;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNEnt.blp";
  public readonly cost = 150;
  public readonly cooldown = 20;
  public readonly itemTypeId = FourCC("I05N");
  public readonly description = (
    level: number,
  ) => `Summons 2 Treants every 20 seconds that fight by your side.

Damage: |cffffcc0015 - 17|r
Cooldown: |cffffcc0020s|r
Health: |cffffcc00300|r
Duration: |cffffcc0015s|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00normal|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly itemTreants = new Map<number, Unit[]>();
  private readonly treantUnitTypeId: number = FourCC("e003");

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
      const treants: Unit[] = [];
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = x + 150 * Math.cos(radians);
        const wy = y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/Treants/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const treant = Unit.create(owner, this.treantUnitTypeId, wx, wy);
        treant.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
        treants.push(treant);
      }
      this.itemTreants.set(itemId, treants);
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

    const treants = this.itemTreants.get(itemId);
    this.itemTreants.delete(itemId);
    if (treants == null) return;
    for (const treant of treants) {
      if (treant.isAlive()) treant.kill();
    }
  }
}
