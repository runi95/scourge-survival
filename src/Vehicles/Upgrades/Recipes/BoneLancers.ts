import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../Utility/Globals";

const MULT = Math.PI / 180;

// Raises Bone Lancers; BoneLancersDamageEvent drives spikes through the
// target of every third blow
export class BoneLancers extends WeaponUpgradeRecipe {
  public readonly cooldown = 8;
  public readonly itemTypeId = FourCC("I0A4");
  public readonly merchantItemTypeId = FourCC("I0A5");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemLancers = new Map<number, Unit[]>();
  private readonly lancerUnitTypeId: number = FourCC("u028");

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
      // Earlier lancers can still be up
      const lancers = (this.itemLancers.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const lx = x + 150 * Math.cos(radians);
      const ly = y + 150 * Math.sin(radians);
      Effect.create(
        "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
        lx,
        ly,
      ).destroy();
      const lancer = Unit.create(owner, this.lancerUnitTypeId, lx, ly);
      lancer.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
      lancer.setAnimation("birth");
      lancer.queueAnimation("stand");
      lancers.push(lancer);
      this.itemLancers.set(itemId, lancers);
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

    const lancers = this.itemLancers.get(itemId);
    this.itemLancers.delete(itemId);
    if (lancers == null) return;
    for (const lancer of lancers) {
      if (lancer.isAlive()) lancer.kill();
    }
  }
}
