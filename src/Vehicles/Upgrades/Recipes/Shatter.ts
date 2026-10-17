import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class Shatter extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I04S");
  public readonly merchantItemTypeId = FourCC("I04T");
  public readonly recipe: number[] = [FourCC("I041"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly frostNovaAbilityId: number = FourCC("A03B");
  private readonly frozen = new Map<
    number,
    { nova: number; owner: MapPlayer }
  >();
  private novaCount = 0;

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      const frozen = this.frozen.get(dying.id);
      if (frozen == null) return;
      this.frozen.delete(dying.id);

      const { owner } = frozen;
      const { x, y } = dying;
      let nearest: Unit | undefined;
      let nearestDistance = 0;
      const grp = Group.fromRange(600, dying.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (nearest != null && distance >= nearestDistance) return;
        nearest = u;
        nearestDistance = distance;
      });
      grp.destroy();

      Effect.create(
        "Abilities/Weapons/FrostWyrmMissile/FrostWyrmMissile.mdl",
        x,
        y,
      ).destroy();
      if (nearest == null) return;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.frostNovaAbilityId);
      dummy.issueTargetOrder("frostnova", nearest);
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
      const enemies: Unit[] = [];
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (enemies.length === 0) return;

      const { x, y } = vehicle.unit;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];

      // Everything the nova slows can shatter for its 3 seconds
      const nova = ++this.novaCount;
      const hit: number[] = [];
      const area = Group.fromRange(200, target.point);
      area.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hit.push(u.id);
        this.frozen.set(u.id, { nova, owner });
      });
      area.destroy();

      const thaw: Timer = TimerUtils.newTimer();
      thaw.start(3, false, () => {
        TimerUtils.releaseTimer(thaw);
        for (const id of hit) {
          if (this.frozen.get(id)?.nova === nova) this.frozen.delete(id);
        }
      });

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.frostNovaAbilityId);
      dummy.issueTargetOrder("frostnova", target);
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
