import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class Scattergun extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I03B");
  public readonly merchantItemTypeId = FourCC("I03C");
  public readonly recipe: number[] = [FourCC("I00Y"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly scattergunUnitTypeId: number = FourCC("u011");
  private readonly itemRiflemanMap = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemToDestinationMap = new Map<number, [number, number]>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    this.itemIterations.set(itemId, 0);
    t.start(0.5, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      this.itemIterations.set(itemId, (iterations + 1) % 4);
      if (iterations === 0) {
        const { x, y } = vehicle.unit;
        const radian = RandomNumberGenerator.random(0, 359) * MULT;
        const radius = RandomNumberGenerator.random(150, 350);
        const dx = radius * Math.cos(radian) + x;
        const dy = radius * Math.sin(radian) + y;
        this.itemToDestinationMap.set(itemId, [dx, dy]);
        Effect.create(
          "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
          dx,
          dy,
        ).destroy();
      } else if (iterations === 1) {
        const destination = this.itemToDestinationMap.get(itemId);
        if (destination == null) return;

        const [dx, dy] = destination;
        this.itemToDestinationMap.delete(itemId);
        this.itemRiflemanMap.set(
          itemId,
          Unit.create(owner, this.scattergunUnitTypeId, dx, dy),
        );

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      } else if (iterations === 3) {
        const rifleman = this.itemRiflemanMap.get(itemId);
        if (rifleman == null) return;

        Effect.create(
          "Abilities/Spells/NightElf/Blink/BlinkCaster.mdl",
          rifleman.x,
          rifleman.y,
        ).destroy();
        rifleman.destroy();
        this.itemRiflemanMap.delete(itemId);
      }
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
    this.itemIterations.delete(itemId);
    this.itemToDestinationMap.delete(itemId);

    const rifleman = this.itemRiflemanMap.get(itemId);
    this.itemRiflemanMap.delete(itemId);
    if (rifleman == null) return;

    rifleman.destroy();
  }
}
