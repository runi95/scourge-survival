import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

export class TrojanMine extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I02D");
  public readonly merchantItemTypeId = FourCC("I02C");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly trojanMineTrigger: Trigger;
  private readonly trojanMineUnitTypeId: number = FourCC("n00M");
  private readonly clockwerkGoblinUnitTypeId: number = FourCC("n007");

  constructor() {
    super();

    this.trojanMineTrigger = Trigger.create();
    this.trojanMineTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.trojanMineTrigger.addAction(() => {
      const mine = Unit.fromEvent();
      if (mine.typeId !== this.trojanMineUnitTypeId) return;

      const { owner, x, y } = mine;
      for (let i = 0; i < 3; i++) {
        const dummy = Unit.create(owner, this.clockwerkGoblinUnitTypeId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 12);
      }
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
    t.start(3, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const dummy = Unit.create(owner, this.trojanMineUnitTypeId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
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
