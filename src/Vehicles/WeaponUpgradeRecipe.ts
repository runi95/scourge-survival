import { WeaponUpgrade } from "./WeaponUpgrade";

export abstract class WeaponUpgradeRecipe extends WeaponUpgrade {
  // Required
  public readonly isWeapon: boolean = true;
  public abstract readonly recipe: number[];
  public abstract readonly merchantItemTypeId: number;
}
