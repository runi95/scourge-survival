import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { LongRifleDamageEvent } from "../../../../Utility/DamageEngine/DamageEvents/LongRifleDamageEvent";

const MULT = Math.PI / 180;

export class LongRifle extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNDwarvenLongRifle.blp";
  public readonly cost = 300;
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I00Y");
  public readonly description = (
    level: number
  ) => `Fire off a long rifle, dealing damage based on distance to the target.

Damage: |cffffcc0075 - 750|r
Cooldown: |cffffcc005s|r
Range: |cffffcc001500|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00piercing|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly longRifleUnitTypeId: number = FourCC("u00O");
  private readonly itemRiflemanMap = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemToDestinationMap = new Map<number, [number, number]>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    LongRifleDamageEvent.READY_INSTANCES++;
    LongRifleDamageEvent.PLAYER_LONG_RIFLE_COUNT[owner.id]++;

    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown
    );

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    this.itemIterations.set(itemId, 0);
    t.start(1, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations >= 5) {
        const destination = this.itemToDestinationMap.get(itemId);
        if (destination == null) {
          this.itemIterations.set(itemId, 0);
          return;
        }

        const [dx, dy] = destination;
        const rifleman = Unit.create(owner, this.longRifleUnitTypeId, dx, dy);
        this.itemRiflemanMap.set(itemId, rifleman);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown
        );

        this.itemIterations.set(itemId, 0);
        this.itemToDestinationMap.delete(itemId);
      } else {
        if (iterations === 4) {
          const { x, y } = vehicle.unit;

          const randomAngle = RandomNumberGenerator.random(0, 359);
          const radian = randomAngle * MULT;
          const radius = RandomNumberGenerator.random(200, 700);
          const dx = radius * Math.cos(radian) + x;
          const dy = radius * Math.sin(radian) + y;
          this.itemToDestinationMap.set(itemId, [dx, dy]);
          Effect.create(
            "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
            dx,
            dy
          ).destroy();
        } else if (iterations === 2) {
          const rifleman = this.itemRiflemanMap.get(itemId);
          if (rifleman != null) {
            const { x, y } = rifleman;
            Effect.create(
              "Abilities/Spells/NightElf/Blink/BlinkCaster.mdl",
              x,
              y
            ).destroy();
            rifleman.destroy();
            this.itemRiflemanMap.delete(itemId);
          }
        }

        this.itemIterations.set(itemId, iterations + 1);
      }
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    LongRifleDamageEvent.READY_INSTANCES--;
    LongRifleDamageEvent.PLAYER_LONG_RIFLE_COUNT[owner.id]--;
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
    this.itemIterations.delete(itemId);
    this.itemToDestinationMap.delete(itemId);

    const rifleman = this.itemRiflemanMap.get(itemId);
    if (rifleman == null) return;

    rifleman.destroy();
  }
}
