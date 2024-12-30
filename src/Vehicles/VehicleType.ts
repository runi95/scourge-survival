import type { VehicleUpgrade } from "./VehicleUpgrade";
import type { Unit } from "w3ts";

export abstract class VehicleType {
  public readonly name: string = this.constructor.name;
  public abstract unitTypeId: number;
  public abstract upgrades: VehicleUpgrade[][];

  public initializeCustomData(): unknown {
    return;
  }

  public applyInitialUnitValues(_unit: Unit): void {
    return;
  }
}
