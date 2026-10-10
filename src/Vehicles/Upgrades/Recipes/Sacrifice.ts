import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class Sacrifice extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I04W");
  public readonly merchantItemTypeId = FourCC("I04X");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I02K")];

  private readonly timers = new Map<number, Timer>();
  // Held items: they gain a charge whenever an enemy of their owner dies
  private readonly items = new Map<
    number,
    { item: Item; owner: MapPlayer; missiles: number }
  >();
  private readonly missileUnitId: number = FourCC("u01L");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      const playerId = dying.owner.id - 9;
      this.items.forEach(({ item, owner }) => {
        if (owner.id !== playerId) return;
        item.charges += 1;
      });
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const sacrifice = { item, owner, missiles: 0 };
    this.items.set(itemId, sacrifice);

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (item.charges < 1) return;

      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      if (enemies.length === 0) return;

      item.charges -= 1;
      const { x, y } = vehicle.unit;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const missile = Unit.create(owner, this.missileUnitId, x, y);
      missile.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      missile.issueTargetOrder("attack", target);

      // Every 8th missile cripples its target
      sacrifice.missiles++;
      if (sacrifice.missiles % 8 !== 0) return;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, target);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    this.items.delete(itemId);
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
