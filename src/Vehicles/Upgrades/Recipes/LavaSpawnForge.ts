import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class LavaSpawnForge extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I031");
  public readonly merchantItemTypeId = FourCC("I032");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00V")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemForges = new Map<number, Unit>();
  private readonly forgeUnitTypeId: number = FourCC("n00Q");
  private readonly lavaSpawnUnitTypeId: number = FourCC("n00P");
  private readonly smallLavaSpawnUnitTypeId: number = FourCC("n00O");
  private onDeathTrigger: Trigger;

  public onInitialize(): void {
    this.onDeathTrigger = Trigger.create();
    this.onDeathTrigger.addAction(() => {
      const lavaSpawn = Unit.fromEvent();
      if (lavaSpawn.typeId !== this.lavaSpawnUnitTypeId) return;

      const { owner, x, y } = lavaSpawn;
      for (let i = 0; i < 2; i++) {
        this.spawn(owner, this.smallLavaSpawnUnitTypeId, x, y, 50);
      }
    });
    this.onDeathTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    const existingIterations = this.itemIterations.get(itemId);
    if (existingIterations == null) {
      this.itemIterations.set(itemId, 12);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        5 * (12 - existingIterations),
      );
    }

    t.start(5, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 11) {
        this.itemIterations.set(itemId, iterations + 1);

        const forge = this.itemForges.get(itemId);
        if (forge == null || !forge.isAlive()) return;

        this.spawn(owner, this.lavaSpawnUnitTypeId, forge.x, forge.y, 200);
        return;
      }

      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const forge = Unit.create(
        owner,
        this.forgeUnitTypeId,
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
      forge.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      this.itemForges.set(itemId, forge);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
    this.itemForges.delete(itemId);
  }

  private spawn(
    owner: MapPlayer,
    unitTypeId: number,
    x: number,
    y: number,
    distance: number,
  ): void {
    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    const lavaSpawn = Unit.create(
      owner,
      unitTypeId,
      x + distance * Math.cos(radians),
      y + distance * Math.sin(radians),
    );
    lavaSpawn.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
    lavaSpawn.setAnimation("birth");
    lavaSpawn.queueAnimation("stand");
  }
}
