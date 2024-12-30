import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class ManaLeech extends VehicleUpgrade {
  public readonly name = "Mana Leech";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNBrilliance.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly description = "Regenerate +5 mana on kill.";

  public applyUpgrade(_vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
