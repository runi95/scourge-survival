import { Unit } from "w3ts";

export class Creep {
  public attackX: number;
  public attackY: number;
  public readonly unit: Unit;

  constructor(unit: Unit, attackX: number, attackY: number) {
    this.unit = unit;
    this.attackX = attackX;
    this.attackY = attackY;
  }
}
