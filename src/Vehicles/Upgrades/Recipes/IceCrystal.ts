import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Crystal {
  effect: Effect;
  at: Point;
  age: number;
}

// Ice crystals left behind the hero grow bigger and deadlier every second
// nobody touches them, and shatter on the first enemy that does
export class IceCrystal extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0C6");
  public readonly merchantItemTypeId = FourCC("I0C7");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I003")];

  private readonly placeTimers = new Map<number, Timer>();
  private readonly growTimers = new Map<number, Timer>();
  private readonly itemCrystals = new Map<number, Crystal[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chillAbilityId: number = FourCC("A04W");
  private readonly maxCrystals = 4;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const crystals: Crystal[] = [];
    this.itemCrystals.set(itemId, crystals);

    const place: Timer = TimerUtils.newTimer();
    this.placeTimers.set(itemId, place);
    place.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (crystals.length >= this.maxCrystals) return;

      const { x, y } = vehicle.unit;
      const effect = Effect.create(
        "Abilities/Spells/Undead/FreezingBreath/FreezingBreathTargetArt.mdl",
        x,
        y,
      );
      effect.scale = 0.5;
      crystals.push({ effect, at: Point.create(x, y), age: 0 });
    });

    const grow: Timer = TimerUtils.newTimer();
    this.growTimers.set(itemId, grow);
    grow.start(0.25, true, () => {
      for (let i = crystals.length - 1; i >= 0; i--) {
        const crystal = crystals[i];
        crystal.age = Math.min(10, crystal.age + 0.25);
        crystal.effect.scale = 0.5 + 0.1 * crystal.age;
        if (!this.touched(owner, crystal.at)) continue;

        crystals.splice(i, 1);
        this.shatter(owner, crystal);
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
    TimerUtils.releaseTimer(this.placeTimers.get(itemId));
    this.placeTimers.delete(itemId);
    TimerUtils.releaseTimer(this.growTimers.get(itemId));
    this.growTimers.delete(itemId);

    for (const crystal of this.itemCrystals.get(itemId) ?? []) {
      crystal.effect.destroy();
      crystal.at.destroy();
    }
    this.itemCrystals.delete(itemId);
  }

  private touched(owner: MapPlayer, at: Point): boolean {
    let touched = false;
    const grp = Group.fromRange(175, at);
    grp.for((u) => {
      if (!touched && this.isVictim(u, owner)) touched = true;
    });
    grp.destroy();
    return touched;
  }

  // 100 damage in 200, growing by 25 and 15 every second it was left alone,
  // up to 350 in 350 after 10 seconds
  private shatter(owner: MapPlayer, crystal: Crystal): void {
    const { at, age } = crystal;
    const damage = 100 + 25 * age;
    const radius = 200 + 15 * age;
    crystal.effect.destroy();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      Effect.create(
        "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
        at.x + 0.5 * radius * Math.cos(angle),
        at.y + 0.5 * radius * Math.sin(angle),
      ).destroy();
    }
    const dummy = Unit.create(owner, this.dummyUnitId, at.x, at.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        damage,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) return;
      const chiller = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      chiller.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      chiller.addAbility(this.chillAbilityId);
      chiller.issueTargetOrder(OrderId.Slow, u);
    });
    grp.destroy();
    at.destroy();
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }
}
