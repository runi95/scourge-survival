import { VehicleAbility } from "./VehicleAbility";
import { Vehicle } from "./Vehicle";
import { VehicleUpgradeRarity } from "./VehicleUpgradeRarity";
import type { Race } from "../Game/Race";

export abstract class VehicleUpgrade {
  // Required
  public readonly name: string = this.constructor.name;
  public readonly maxLevel: number | null = null;
  public readonly isWeapon: boolean = false;
  public abstract readonly rarity: VehicleUpgradeRarity;
  public abstract readonly icon: string;
  public abstract readonly cost: number;
  public abstract readonly description: (level: number) => string;
  public abstract applyUpgrade(vehicle: Vehicle): void;

  // Optional
  public readonly race?: Race = undefined;
  public readonly newUnitTypeId?: number = undefined;
  public readonly newUnitSkinTypeId?: number = undefined;
  public readonly ability?: VehicleAbility = undefined;
}
