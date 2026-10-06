import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class PurgingSpear extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I03N");
  public readonly merchantItemTypeId = FourCC("I03O");
  public readonly recipe: number[] = [FourCC("I02M"), FourCC("I00Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly spearUnitId: number = FourCC("u014");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly purgeAbilityId: number = FourCC("A032");

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
      const grp: Group = Group.fromRange(600, vehicle.unit.point);

      let hasThrown = false;
      grp.for((u) => {
        if (hasThrown) return;
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        hasThrown = true;

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );

        const spear = Unit.create(owner, this.spearUnitId, x, y);
        spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        spear.issueTargetOrder("attack", u);

        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
        dummy.addAbility(this.purgeAbilityId);
        dummy.issueTargetOrder("purge", u);
      });
      grp.destroy();
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
