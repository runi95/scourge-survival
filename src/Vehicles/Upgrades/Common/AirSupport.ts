import { Timer, Unit } from "w3ts/index";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

export class AirSupport extends VehicleUpgrade {
  public readonly name = "Air Support";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNFlyingMachine.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];

  private readonly flyingMachineUnitTypeId: number = FourCC("h000");
  private readonly playerFlyingMachines: Unit[][] = [];

  public applyUpgrade(vehicle: Vehicle): void {
    const owner = vehicle.unit.owner;
    const playerId = owner.id;
    const airSupportLevel = vehicle.upgradeMap.get(this.name);
    if (airSupportLevel === 1) {
      vehicle.unit.addItemById(FourCC("I006"));
      this.playerFlyingMachines[playerId] = [];
      const t: Timer = TimerUtils.newTimer();
      this.playerTimers[playerId] = t;
      t.start(2, true, () => {
        const { x, y } = vehicle.unit;
        for (let i = 0; i < this.playerFlyingMachines[playerId].length; i++) {
          const flyingMachine = this.playerFlyingMachines[playerId][i];
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

    const { x, y } = vehicle.unit;
    for (let i = 0; i < 3; i++) {
      const flyingMachine = Unit.create(
        owner,
        this.flyingMachineUnitTypeId,
        x + RandomNumberGenerator.random(-250, 250),
        y + RandomNumberGenerator.random(-250, 250)
      );
      flyingMachine.issueTargetOrder("patrol", vehicle.unit);
      this.playerFlyingMachines[playerId].push(flyingMachine);
    }
  }
}
