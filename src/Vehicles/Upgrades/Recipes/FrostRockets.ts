import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class FrostRockets extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I0AS");
  public readonly merchantItemTypeId = FourCC("I0AT");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly novaAbilityId: number = FourCC("A04T");

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

      const enemies = this.enemiesAround(owner, vehicle.unit.point, 700);
      if (enemies.length === 0) return;

      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      this.fireRocket(
        owner,
        vehicle.unit.x,
        vehicle.unit.y,
        target.x,
        target.y,
      );
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

  private fireRocket(
    owner: MapPlayer,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    const rocket = Effect.create(
      "war3mapImported/IceRocketMissile.mdx",
      fromX,
      fromY,
    );
    rocket.setYaw(Math.atan2(toY - fromY, toX - fromX));

    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      elapsed = Math.min(0.7, elapsed + 0.03);
      const progress = elapsed / 0.7;
      rocket.x = fromX + (toX - fromX) * progress;
      rocket.y = fromY + (toY - fromY) * progress;
      rocket.setHeight(60 + 1000 * progress * (1 - progress));
      if (elapsed < 0.7) return;

      TimerUtils.releaseTimer(t);
      rocket.setAlpha(0);
      rocket.destroy();
      this.freezeArea(owner, toX, toY);
    });
  }

  private freezeArea(owner: MapPlayer, x: number, y: number): void {
    const center = Point.create(x, y);
    let novas = 0;
    const t = TimerUtils.newTimer();
    const nova = () => {
      const enemies = this.enemiesAround(owner, center, 200);
      if (enemies.length === 0) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const distance = RandomNumberGenerator.random(0, 200);
        Effect.create(
          "Abilities\\Spells\\Undead\\FrostNova\\FrostNovaTarget.mdl",
          x + distance * Math.cos(radians),
          y + distance * Math.sin(radians),
        ).destroy();
      } else {
        const target =
          enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.addAbility(this.novaAbilityId);
        dummy.issueTargetOrder("frostnova", target);
      }

      if (++novas < 10) return;
      TimerUtils.releaseTimer(t);
      center.destroy();
    };
    nova();
    t.start(0.5, true, nova);
  }

  private enemiesAround(
    owner: MapPlayer,
    center: Point,
    radius: number,
  ): Unit[] {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(radius, center);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      enemies.push(u);
    });
    grp.destroy();
    return enemies;
  }
}
