import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class HauntedGraveyard extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I0BG");
  public readonly merchantItemTypeId = FourCC("I0BH");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I05K")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemSkeletons = new Map<number, Unit[]>();
  private readonly skeletonUnitTypeId: number = FourCC("u01A");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const summon = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      // Earlier skeletons can still be up
      const skeletons = (this.itemSkeletons.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      for (let i = 0; i < 3; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = x + 150 * Math.cos(radians);
        const wy = y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/RaiseDead/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const skeleton = Unit.create(owner, this.skeletonUnitTypeId, wx, wy);
        skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
        skeleton.setAnimation("birth");
        skeleton.queueAnimation("stand");
        skeletons.push(skeleton);
      }
      this.itemSkeletons.set(itemId, skeletons);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, summon);
    summon();
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

    const skeletons = this.itemSkeletons.get(itemId);
    this.itemSkeletons.delete(itemId);
    if (skeletons == null) return;
    for (const skeleton of skeletons) {
      if (skeleton.isAlive()) skeleton.kill();
    }
  }
}
