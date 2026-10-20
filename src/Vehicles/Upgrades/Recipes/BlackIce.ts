import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { BlackIceDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BlackIceDamageEvent";

export class BlackIce extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.6;
  public readonly itemTypeId = FourCC("I0AM");
  public readonly merchantItemTypeId = FourCC("I0AN");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I05M")];

  private readonly timers = new Map<number, Timer>();
  private readonly boltUnitTypeId: number = FourCC("u02C");

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
      let coldest: Unit | undefined;
      let coldestChill = 0;
      const enemies: Unit[] = [];
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
        const chill = BlackIceDamageEvent.chillOf(u);
        if (chill <= coldestChill) return;
        coldest = u;
        coldestChill = chill;
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (enemies.length === 0) return;

      const { x, y } = vehicle.unit;
      const target =
        coldest ?? enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const bolt = Unit.create(owner, this.boltUnitTypeId, x, y);
      bolt.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      bolt.issueTargetOrder("attack", target);
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
