import { Item, MapPlayer, Point, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class StasisWard extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I03T");
  public readonly merchantItemTypeId = FourCC("I03U");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly stasisAbilityId: number = FourCC("A036");
  private readonly stasisWardUnitTypeId: number = FourCC("o001");
  private readonly chainLightningAbilityTypeId: number = FourCC("A000");
  private detonationTrigger: Trigger;

  public onInitialize(): void {
    this.detonationTrigger = Trigger.create();
    this.detonationTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.detonationTrigger.addAction(() => {
      const ward = Unit.fromEvent();
      if (ward.typeId !== this.stasisWardUnitTypeId) return;

      const { owner, x, y } = ward;
      this.callChainLightning(owner, x, y);
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
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.stasisAbilityId);
      dummy.issueOrderAt("stasistrap", x, y);
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

  private callChainLightning(owner: MapPlayer, x: number, y: number): void {
    const loc = Point.create(x, y);
    const grp = Group.fromRange(400, loc);
    let targets = 0;
    grp.for((u) => {
      if (targets > 3) return;
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (!u.isVisible(owner)) return;
      targets++;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.chainLightningAbilityTypeId);
      dummy.issueTargetOrder("chainlightning", u);
    });
    grp.destroy();
    loc.destroy();
  }
}
