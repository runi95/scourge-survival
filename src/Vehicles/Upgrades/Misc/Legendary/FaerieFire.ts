import { Vehicle } from "../../../Vehicle";
import { VehicleUpgrade } from "../../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { Race } from "../../../../Game/Race";

export class FaerieFire extends VehicleUpgrade {
  public readonly name = "Faerie Fire";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly race = Race.NIGHT_ELF;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNFaerieFire.blp";
  public readonly cost = 500;
  public readonly maxLevel = 1;
  public readonly description = () =>
    "Enemies are covered in Faerie Fire for |cffffcc0060|r seconds when they spawn, revealing them and reducing their armor by |cffffcc004|r";

  public applyUpgrade(_vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
