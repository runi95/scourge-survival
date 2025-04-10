import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";

export class AirSupport extends WeaponUpgrade {
  public readonly name = "Air Support";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNFlyingMachine.blp";
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I006");
  public readonly cost = 150;
  public readonly description = (
    level: number
  ) => `Spawns 3 Flying Machines that follows your hero around to attack nearby enemy units.

Damage: |cffffcc003 x 25|r
Cooldown: |cffffcc002s|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00siege|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly flyingMachineUnitTypeId: number = FourCC("h000");
  private readonly playerFlyingMachines = new Map<number, Unit[]>();
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
        const flyingMachines: Unit[] = [];
        this.playerFlyingMachines.set(itemId, flyingMachines);
        for (let i = 0; i < 3; i++) {
          const flyingMachine = Unit.create(
            owner,
            this.flyingMachineUnitTypeId,
            x + RandomNumberGenerator.random(-250, 250),
            y + RandomNumberGenerator.random(-250, 250)
          );
          flyingMachine.issueTargetOrder("patrol", vehicle.unit);
          flyingMachines.push(flyingMachine);
        }

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 23) {
        const flyingMachines = this.playerFlyingMachines.get(itemId);
        if (flyingMachines == null) return;

        this.playerFlyingMachines.set(itemId, []);
        for (const flyingMachine of flyingMachines) {
          flyingMachine.kill();
        }

        return;
      } else if (iterations >= 29) {
        this.itemIterations.set(itemId, 0);
      } else if (iterations > 23) {
        return;
      }

      const { x, y } = vehicle.unit;
      const flyingMachines = this.playerFlyingMachines.get(itemId);
      if (flyingMachines == null) return;
      for (const flyingMachine of flyingMachines) {
        const dist = Math.sqrt(
          Math.pow(flyingMachine.x - x, 2) + Math.pow(flyingMachine.y - y, 2)
        );
        if (dist < 1000) {
          flyingMachine.issueOrderAt(
            "attack",
            x + RandomNumberGenerator.random(-250, 250),
            y + RandomNumberGenerator.random(-250, 250)
          );
        } else {
          flyingMachine.issueOrderAt(
            "move",
            x + RandomNumberGenerator.random(-250, 250),
            y + RandomNumberGenerator.random(-250, 250)
          );
        }
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

    const flyingMachines = this.playerFlyingMachines.get(itemId);
    if (flyingMachines == null) return;

    for (const flyingMachine of flyingMachines) {
      flyingMachine.kill();
    }
  }
}
