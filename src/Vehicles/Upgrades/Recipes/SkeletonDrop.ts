import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class SkeletonDrop extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0C0");
  public readonly merchantItemTypeId = FourCC("I0C1");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A01B");
  private readonly unitTypeId: number = FourCC("u01A");

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
      const grp = Group.fromRange(700, vehicle.unit.point);
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
        const at = { x: target.x, y: target.y };
        const later: Timer = TimerUtils.newTimer();
        later.start(1, false, () => {
          TimerUtils.releaseTimer(later);
          for (let i = 0; i < 2; i++) {
            const radians = RandomNumberGenerator.random(0, 359) * MULT;
            const sx = at.x + 80 * Math.cos(radians);
            const sy = at.y + 80 * Math.sin(radians);
            Effect.create(
              "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
              sx,
              sy,
            ).destroy();
            const summoned = Unit.create(owner, this.unitTypeId, sx, sy);
            summoned.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 8);
            summoned.setAnimation("birth");
            summoned.queueAnimation("stand");
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
