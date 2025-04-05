import { Item, MapPlayer } from "w3ts";
import { Vehicle } from "./Vehicle";
import { VehicleUpgrade } from "./VehicleUpgrade";

export interface WeaponUpgradeI {
  readonly itemTypeId: number;
  readonly cooldown: number;
  onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    item: Item,
    itemId: number,
    weaponIndex: number
  ): void;
  onDrop(
    vehicle: Vehicle,
    owner: MapPlayer,
    item: Item,
    itemId: number,
    weaponIndex: number
  ): void;
  applyUpgrade(vehicle: Vehicle): void;
}

export abstract class WeaponUpgrade
  extends VehicleUpgrade
  implements WeaponUpgradeI
{
  // Required
  public readonly isWeapon: boolean = true;
  public abstract readonly itemTypeId: number;
  public abstract readonly cooldown: number;
  public abstract onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    item: Item,
    itemId: number,
    weaponIndex: number
  ): void;
  public abstract onDrop(
    vehicle: Vehicle,
    owner: MapPlayer,
    item: Item,
    itemId: number,
    weaponIndex: number
  ): void;

  public applyUpgrade(vehicle: Vehicle): void {
    vehicle.unit.addItemById(this.itemTypeId);
  }
}
