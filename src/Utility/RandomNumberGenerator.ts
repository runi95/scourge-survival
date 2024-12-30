export class RandomNumberGenerator {
  private static readonly a: number = 1103515245;
  private static readonly c: number = 12345;
  private static seed = 1;

  // Static only class
  protected constructor() {}

  public static setSeed(seed: number): void {
    this.seed = seed & 0x7fffffff;
  }

  public static next(): number {
    this.seed = (this.seed * this.a + this.c) & 0x7fffffff;
    return this.seed;
  }

  public static random(min: number, max: number): number {
    if (min > max) {
      error(`min can't be greater than max`);
      return -1;
    }

    return ModuloInteger(this.next(), max + 1 - min) + min;
  }
}

RandomNumberGenerator.setSeed(GetRandomInt(1, Number.MAX_SAFE_INTEGER));
