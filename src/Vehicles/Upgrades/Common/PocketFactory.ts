import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class PocketFactory extends VehicleUpgrade {
  public readonly name = "Pocket Factory";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNPocketFactory.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = `Spawns a Pocket Factory every 60 seconds. The Pocket Factory spawns a Clockwerk Goblin every 5 seconds that explodes upon death.

Damage: |cffffcc008 (attack) + 60 (explosion)|r
Cooldown: |cffffcc0060s (factory) + 5s (goblin)|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00normal (attack) + spell (explosion)|r
Health: |cffffcc00300 (factory) + 125 (goblin)|r
Duration: |cffffcc0060s (factory) + 12s (goblin)|r`;

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00O"));
  }
}
