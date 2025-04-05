import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../../Utility/Globals";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class PocketFactory extends WeaponUpgrade {
  public readonly name = "Pocket Factory";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNPocketFactory.blp";
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I00O");
  public readonly cost = 150;
  public readonly description = (
    level: number
  ) => `Spawns a Pocket Factory every 60 seconds. The Pocket Factory spawns a Clockwerk Goblin every 5 seconds that explodes upon death.

Damage: |cffffcc008 (attack) + 60 (explosion)|r
Cooldown: |cffffcc0060s (factory) + 5s (goblin)|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00normal (attack) + spell (explosion)|r
Health: |cffffcc00 300 (factory) + 125 (goblin)|r
Duration: |cffffcc0060s (factory) + 12s (goblin)|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly pocketFactoryAbilityId: number = FourCC("A01C");
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
    this.itemIterations.set(itemId, 30);
    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 29) {
        this.itemIterations.set(itemId, iterations + 1);
        return;
      }

      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.pocketFactoryAbilityId);

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      dummy.issueOrderAt(
        "summonfactory",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians)
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
    this.itemIterations.delete(itemId);
  }
}
