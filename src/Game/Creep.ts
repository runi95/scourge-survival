import { Unit } from "w3ts";

export class Creep {
  public readonly spawnX: number;
  public readonly spawnY: number;
  public attackMoveIndex: number;
  public attackOrderPosition: [number, number] | null = null;
  public readonly unit: Unit;

  constructor(
    unit: Unit,
    spawnX: number,
    spawnY: number,
    attackMoveIndex: number
  ) {
    this.unit = unit;
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.attackMoveIndex = attackMoveIndex;
  }
}
