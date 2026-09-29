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
  private readonly javelinUnitId: number = FourCC("u013");
  private readonly stasisAbilityId: number = FourCC("A036");
  private readonly stasisWardUnitTypeId: number = FourCC("o001");
  private readonly stasisBuffId: number = FourCC("Bsta");
  private readonly detonationTrigger: Trigger;

  constructor() {
    super();

    this.detonationTrigger = Trigger.create();
    this.detonationTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.detonationTrigger.addAction(() => {
      const ward = Unit.fromEvent();
      if (ward.typeId !== this.stasisWardUnitTypeId) return;

      const { owner, x, y } = ward;
      const t = TimerUtils.newTimer();
      t.start(0.1, false, () => {
        TimerUtils.releaseTimer(t);
        this.throwJavelins(owner, x, y);
      });
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

  private throwJavelins(owner: MapPlayer, x: number, y: number): void {
    const stunned: Unit[] = [];
    const loc = Point.create(x, y);
    const grp = Group.fromRange(400, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.getAbilityLevel(this.stasisBuffId) === 0) return;

      stunned.push(u);
    });
    grp.destroy();
    loc.destroy();

    if (stunned.length === 0) return;

    for (let i = 0; i < 4; i++) {
      const javelin = Unit.create(owner, this.javelinUnitId, x, y);
      javelin.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      javelin.issueTargetOrder("attack", stunned[i % stunned.length]);
    }
  }
}
