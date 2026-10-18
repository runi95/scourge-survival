import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Sends carrion bats from a Carrion Feast Caster; CarrionFeastDamageEvent
// cripples what they hit and devours it once it is weak enough
export class CarrionFeast extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0BM");
  public readonly merchantItemTypeId = FourCC("I0BN");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly casterUnitTypeId: number = FourCC("u02E");
  private readonly carrionSwarmAbilityId: number = FourCC("A044");

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
      // Carrion bats go for the most wounded
      let target: Unit | undefined;
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        if (
          target != null &&
          u.life / u.maxLife >= target.life / target.maxLife
        )
          return;
        target = u;
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (target == null) return;

      const { x, y } = vehicle.unit;
      const caster = Unit.create(owner, this.casterUnitTypeId, x, y);
      caster.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      caster.addAbility(this.carrionSwarmAbilityId);
      caster.issueOrderAt("carrionswarm", target.x, target.y);
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
