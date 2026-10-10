import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class NecromancersGrasp extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I04U");
  public readonly merchantItemTypeId = FourCC("I04V");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I04O")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");
  private readonly skeletonUnitTypeId: number = FourCC("u01A");
  // Enemies crippled by this weapon: handle id -> the cast and who cast it
  private readonly crippled = new Map<
    number,
    { cast: number; owner: MapPlayer }
  >();
  private castCount = 0;

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      const crippled = this.crippled.get(dying.id);
      if (crippled == null) return;
      this.crippled.delete(dying.id);

      const { x, y } = dying;
      Effect.create(
        "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
        x,
        y,
      ).destroy();
      const skeleton = Unit.create(
        crippled.owner,
        this.skeletonUnitTypeId,
        x,
        y,
      );
      skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
      skeleton.setAnimation("birth");
      skeleton.queueAnimation("stand");
    });
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
    t.start(this.cooldown, true, () => {
      // Enemies that are not crippled yet go first
      const fresh: Unit[] = [];
      const crippled: Unit[] = [];
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        if (this.crippled.has(u.id)) crippled.push(u);
        else fresh.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies = fresh.length > 0 ? fresh : crippled;
      if (enemies.length === 0) return;

      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const cast = ++this.castCount;
      const targetId = target.id;
      this.crippled.set(targetId, { cast, owner });
      const recover: Timer = TimerUtils.newTimer();
      recover.start(3, false, () => {
        TimerUtils.releaseTimer(recover);
        if (this.crippled.get(targetId)?.cast === cast) {
          this.crippled.delete(targetId);
        }
      });

      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, target);
      dummy.damageTarget(
        target.handle,
        200,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
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
