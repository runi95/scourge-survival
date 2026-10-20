import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../Utility/Globals";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class DeathPact extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I0BE");
  public readonly merchantItemTypeId = FourCC("I0BF");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I04O")];

  private readonly raiseTimers = new Map<number, Timer>();
  private readonly pactTimers = new Map<number, Timer>();
  private readonly itemSkeletons = new Map<number, Unit[]>();
  private readonly skeletonUnitTypeId: number = FourCC("u01A");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const raise = () => {
      const { x, y } = vehicle.unit;
      const skeletons = (this.itemSkeletons.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const sx = x + 150 * Math.cos(radians);
      const sy = y + 150 * Math.sin(radians);
      Effect.create(
        "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
        sx,
        sy,
      ).destroy();
      const skeleton = Unit.create(owner, this.skeletonUnitTypeId, sx, sy);
      skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
      skeleton.setAnimation("birth");
      skeleton.queueAnimation("stand");
      skeletons.push(skeleton);
      this.itemSkeletons.set(itemId, skeletons);
    };
    const raises: Timer = TimerUtils.newTimer();
    this.raiseTimers.set(itemId, raises);
    raises.start(4, true, raise);
    raise();

    const pacts: Timer = TimerUtils.newTimer();
    this.pactTimers.set(itemId, pacts);
    pacts.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const skeletons = (this.itemSkeletons.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      this.itemSkeletons.set(itemId, skeletons);
      const oldest = skeletons.shift();
      if (oldest != null) this.sacrifice(vehicle.unit, owner, oldest);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    TimerUtils.releaseTimer(this.raiseTimers.get(itemId));
    this.raiseTimers.delete(itemId);
    TimerUtils.releaseTimer(this.pactTimers.get(itemId));
    this.pactTimers.delete(itemId);

    const skeletons = this.itemSkeletons.get(itemId);
    this.itemSkeletons.delete(itemId);
    if (skeletons == null) return;
    for (const skeleton of skeletons) {
      if (skeleton.isAlive()) skeleton.kill();
    }
  }

  private sacrifice(hero: Unit, owner: MapPlayer, skeleton: Unit): void {
    const { x, y } = skeleton;
    const life = skeleton.life;
    Effect.createAttachment(
      "Abilities/Spells/Undead/DeathPact/DeathPactTarget.mdl",
      skeleton,
      "origin",
    ).destroy();
    Effect.createAttachment(
      "Abilities/Spells/Undead/DeathPact/DeathPactCaster.mdl",
      hero,
      "origin",
    ).destroy();
    Effect.create(
      "Objects/Spawnmodels/Undead/UndeadLargeDeathExplode/UndeadLargeDeathExplode.mdl",
      x,
      y,
    ).destroy();
    hero.life = hero.life + life;

    const grp = Group.fromRange(250, skeleton.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, u);
      dummy.damageTarget(
        u.handle,
        90,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    skeleton.kill();
  }
}
