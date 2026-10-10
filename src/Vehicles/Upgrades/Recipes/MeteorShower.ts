import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class MeteorShower extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I058");
  public readonly merchantItemTypeId = FourCC("I059");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly impactAbilityId: number = FourCC("A03X");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const enemies: Unit[] = [];
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (enemies.length === 0) return;

      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const { x, y } = target;

      let meteors = 0;
      const shower: Timer = TimerUtils.newTimer();
      shower.start(0.2, true, () => {
        meteors++;
        if (meteors >= 5) TimerUtils.releaseTimer(shower);

        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const distance = RandomNumberGenerator.random(0, 250);
        this.dropMeteor(
          owner,
          x + distance * Math.cos(radians),
          y + distance * Math.sin(radians),
        );
      });
    });
  }

  private dropMeteor(owner: MapPlayer, x: number, y: number): void {
    const meteor = Effect.create(
      "Abilities/Spells/Demon/RainOfFire/RainOfFireTarget.mdl",
      x,
      y,
    );

    // The meteor lands after its fall
    const fall: Timer = TimerUtils.newTimer();
    fall.start(0.6, false, () => {
      TimerUtils.releaseTimer(fall);
      meteor.destroy();

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.impactAbilityId);
      dummy.issueImmediateOrder("stomp");
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
  }
}
