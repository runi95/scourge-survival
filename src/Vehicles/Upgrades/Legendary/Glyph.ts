import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Glyph extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNGlyph.blp";
  public readonly cost = 500;
  public readonly description =
    "Gives a 20% chance for creeps that did not drop a rune to drop a tome instead.";

  public applyUpgrade(_vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
