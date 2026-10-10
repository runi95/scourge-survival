import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class BatRockets extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I0A0");
  public readonly merchantItemTypeId = FourCC("I0A1");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A01B");
  private readonly ability2Id: number = FourCC("A044");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

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

      if (enemies.length === 0) return;

      const hx = vehicle.unit.x;
      const hy = vehicle.unit.y;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      {
        const dummy = Unit.create(owner, this.dummyUnitId, hx, hy);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
        dummy.addAbility(this.abilityId);
        dummy.issueOrderAt("clusterrockets", target.x, target.y);
      }
      {
        const dummy = Unit.create(owner, this.dummyUnitId, hx, hy);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
        dummy.addAbility(this.ability2Id);
        dummy.issueOrderAt("carrionswarm", target.x, target.y);
      }
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, tick);
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
