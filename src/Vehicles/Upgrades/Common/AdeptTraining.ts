import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class AdeptTraining extends VehicleUpgrade {
  public readonly name = "Adept Training";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNPriestAdept.blp";
  public readonly cost = 75;
  public readonly maxLevel = 5;
  public readonly description = "Reduces the cooldown of all spells by %10.";

  public applyUpgrade(vehicle: Vehicle): void {
    const adeptTrainingLevel = vehicle.upgradeMap.get(this.name);
    for (const [ability, abilityLevel] of vehicle.skillMap) {
      const originalCooldown = BlzGetAbilityCooldown(ability, abilityLevel - 1);
      if (originalCooldown <= 0) continue;

      const newAbilityCooldown =
        originalCooldown - originalCooldown * adeptTrainingLevel * 0.1;
      vehicle.unit.setAbilityCooldown(
        ability,
        abilityLevel - 1,
        newAbilityCooldown
      );
    }
  }
}
