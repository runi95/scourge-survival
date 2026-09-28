import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class MassRifles extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I02H");
  public readonly merchantItemTypeId = FourCC("I02G");
  public readonly recipe: number[] = [FourCC("I00Y"), FourCC("I00Y")];

  private readonly timers = new Map<number, Timer>();
  private readonly longRifleUnitTypeId: number = FourCC("u00O");
  private readonly itemRiflemanMap1 = new Map<number, Unit>();
  private readonly itemRiflemanMap2 = new Map<number, Unit>();
  private readonly itemRiflemanMap3 = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemToDestinationMap1 = new Map<number, [number, number]>();
  private readonly itemToDestinationMap2 = new Map<number, [number, number]>();
  private readonly itemToDestinationMap3 = new Map<number, [number, number]>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    this.itemIterations.set(itemId, 0);
    t.start(0.5, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations >= 10) {
        const destination = this.itemToDestinationMap1.get(itemId);
        if (destination == null) {
          this.itemIterations.set(itemId, 0);
          return;
        }

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );

        this.itemIterations.set(itemId, 0);
        this.itemToDestinationMap1.delete(itemId);
        this.itemToDestinationMap2.delete(itemId);
        this.itemToDestinationMap3.delete(itemId);
      } else {
        if (iterations === 9) {
          this.spawnRifleman(
            owner,
            itemId,
            this.itemToDestinationMap3,
            this.itemRiflemanMap3,
          );
        } else if (iterations === 8) {
          this.spawnRifleman(
            owner,
            itemId,
            this.itemToDestinationMap2,
            this.itemRiflemanMap2,
          );
        } else if (iterations === 7) {
          this.setTeleportLocation(vehicle, itemId, this.itemToDestinationMap3);
          this.spawnRifleman(
            owner,
            itemId,
            this.itemToDestinationMap1,
            this.itemRiflemanMap1,
          );
        } else if (iterations === 6) {
          this.setTeleportLocation(vehicle, itemId, this.itemToDestinationMap2);
        } else if (iterations === 5) {
          this.setTeleportLocation(vehicle, itemId, this.itemToDestinationMap1);
        } else if (iterations === 1) {
          this.blinkOut(this.itemRiflemanMap1, itemId);
        } else if (iterations === 2) {
          this.blinkOut(this.itemRiflemanMap2, itemId);
        } else if (iterations === 3) {
          this.blinkOut(this.itemRiflemanMap3, itemId);
        }

        this.itemIterations.set(itemId, iterations + 1);
      }
    });
  }

  private setTeleportLocation(
    vehicle: Vehicle,
    itemId: number,
    destinationMap: Map<number, [number, number]>,
  ) {
    const { x, y } = vehicle.unit;

    const randomAngle = RandomNumberGenerator.random(0, 359);
    const radian = randomAngle * MULT;
    const radius = RandomNumberGenerator.random(200, 700);
    const dx = radius * Math.cos(radian) + x;
    const dy = radius * Math.sin(radian) + y;
    destinationMap.set(itemId, [dx, dy]);
    Effect.create(
      "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
      dx,
      dy,
    ).destroy();
  }

  private spawnRifleman(
    owner: MapPlayer,
    itemId: number,
    itemToDestinationMap: Map<number, [number, number]>,
    itemRiflemanMap: Map<number, Unit>,
  ) {
    const destination = itemToDestinationMap.get(itemId);
    if (destination == null) {
      this.itemIterations.set(itemId, 0);
      return;
    }

    const [x, y] = destination;
    const rifleman = Unit.create(owner, this.longRifleUnitTypeId, x, y);

    itemRiflemanMap.set(itemId, rifleman);
  }

  private blinkOut(itemRiflemanMap: Map<number, Unit>, itemId: number) {
    const rifleman = itemRiflemanMap.get(itemId);
    if (rifleman != null) {
      Effect.create(
        "Abilities/Spells/NightElf/Blink/BlinkCaster.mdl",
        rifleman.x,
        rifleman.y,
      ).destroy();
      rifleman.destroy();
      itemRiflemanMap.delete(itemId);
    }
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
    this.itemToDestinationMap1.delete(itemId);

    const rifleman1 = this.itemRiflemanMap1.get(itemId);
    if (rifleman1 != null) {
      rifleman1.destroy();
    }

    const rifleman2 = this.itemRiflemanMap2.get(itemId);
    if (rifleman2 != null) {
      rifleman2.destroy();
    }
    const rifleman3 = this.itemRiflemanMap3.get(itemId);
    if (rifleman3 != null) {
      rifleman3.destroy();
    }
  }
}
