import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class PlagueTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I050");
  public readonly merchantItemTypeId = FourCC("I051");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly trapUnitTypeId: number = FourCC("n00Y");
  private readonly cloudUnitTypeId: number = FourCC("u01M");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const trap = Unit.fromEvent();
      if (trap.typeId !== this.trapUnitTypeId) return;

      const { owner, x, y } = trap;
      const cloud = Unit.create(owner, this.cloudUnitTypeId, x, y);
      cloud.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 5);

      const grp = Group.fromRange(250, trap.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.addAbility(this.crippleAbilityId);
        dummy.issueTargetOrder(OrderId.Cripple, u);
      });
      grp.destroy();
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
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const trap = Unit.create(owner, this.trapUnitTypeId, x, y);
      trap.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
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
