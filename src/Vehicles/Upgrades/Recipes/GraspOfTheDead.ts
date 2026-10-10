import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class GraspOfTheDead extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I04Y");
  public readonly merchantItemTypeId = FourCC("I04Z");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly holdAbilityId: number = FourCC("A03Q");
  private readonly crippleAbilityId: number = FourCC("A03R");

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
      const grp = Group.fromRange(450, vehicle.unit.point);
      grp.for((u) => {
        if (!this.isTarget(u, owner)) return;
        if (!u.isVisible(owner)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (enemies.length === 0) return;

      // The line runs from the hero through a random enemy
      const { x, y } = vehicle.unit;
      const aim = enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const angle = Math.atan2(aim.y - y, aim.x - x);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (let d = 50; d <= 450; d += 50) {
        Effect.create(
          "Abilities/Spells/Undead/Impale/ImpaleMissTarget.mdl",
          x + d * cos,
          y + d * sin,
        ).destroy();
      }

      const grasped: Unit[] = [];
      const line = Group.fromRange(575, vehicle.unit.point);
      line.for((u) => {
        if (!this.isTarget(u, owner)) return;

        // Distance along and away from the line
        const along = (u.x - x) * cos + (u.y - y) * sin;
        const away = Math.abs((u.y - y) * cos - (u.x - x) * sin);
        if (along < 0 || along > 450 || away > 125) return;

        grasped.push(u);
      });
      line.destroy();

      for (const u of grasped) {
        const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.addAbility(this.holdAbilityId);
        dummy.issueTargetOrder(OrderId.Entanglingroots, u);
        dummy.damageTarget(
          u.handle,
          60,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }

      // Crippled once they break free
      const release: Timer = TimerUtils.newTimer();
      release.start(1.5, false, () => {
        TimerUtils.releaseTimer(release);
        for (const u of grasped) {
          if (!u.isAlive()) continue;

          const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
          dummy.addAbility(this.crippleAbilityId);
          dummy.issueTargetOrder(OrderId.Cripple, u);
        }
      });
    });
  }

  private isTarget(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
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
