import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class WildGrowth extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0F0");
  public readonly merchantItemTypeId = FourCC("I0F1");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I05N")];

  private readonly timers = new Map<number, Timer>();
  private readonly unitTypeId: number = FourCC("u01K");
  private readonly unit2TypeId: number = FourCC("efon");

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
        const missile = Unit.create(owner, this.unitTypeId, hx, hy);
        missile.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        missile.issueTargetOrder("attack", target);
      }
      {
        const at = { x: target.x, y: target.y };
        const later: Timer = TimerUtils.newTimer();
        later.start(0.4, false, () => {
          TimerUtils.releaseTimer(later);
          for (let i = 0; i < 1; i++) {
            const radians = RandomNumberGenerator.random(0, 359) * MULT;
            const sx = at.x + 100 * Math.cos(radians);
            const sy = at.y + 100 * Math.sin(radians);
            Effect.create(
              "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
              sx,
              sy,
            ).destroy();
            const summoned = Unit.create(owner, this.unit2TypeId, sx, sy);
            summoned.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 8);
          }
        });
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
