import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class NightTerror extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I09U");
  public readonly merchantItemTypeId = FourCC("I09V");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");

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
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const target =
        enemies.length > 0
          ? enemies[RandomNumberGenerator.random(0, enemies.length - 1)]
          : undefined;
      this.hunt(owner, vehicle.unit, target);
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

  private hunt(owner: MapPlayer, hero: Unit, target?: Unit): void {
    let { x, y } = hero;
    const side = RandomNumberGenerator.random(0, 1) === 0 ? -1 : 1;
    let angle =
      target != null
        ? Math.atan2(target.y - y, target.x - x) + side * 1.3
        : (RandomNumberGenerator.random(0, 359) * Math.PI) / 180;
    const swarm = Effect.create(
      "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmMissile.mdl",
      x,
      y,
    );
    swarm.setYaw(angle);
    swarm.setHeight(60);
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 5);

    const at = Point.create(x, y);
    const hit = new Set<number>();
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      elapsed += 0.03;
      if (target == null) {
        angle -= side * 1.2 * 0.03;
      } else if (target.isAlive()) {
        let turn = Math.atan2(target.y - y, target.x - x) - angle;
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
        const maxTurn = 2.6 * 0.03;
        angle += Math.max(-maxTurn, Math.min(maxTurn, turn));
      }
      x += 700 * 0.03 * Math.cos(angle);
      y += 700 * 0.03 * Math.sin(angle);
      swarm.x = x;
      swarm.y = y;
      swarm.setYaw(angle);
      at.setPosition(x, y);

      const grp = Group.fromRange(150, at);
      grp.for((u) => {
        if (hit.has(u.id)) return;
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hit.add(u.id);
        Effect.createAttachment(
          "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmDamage.mdl",
          u,
          "chest",
        ).destroy();
        dummy.damageTarget(
          u.handle,
          u.handle === target?.handle ? 150 : 100,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();

      if (target == null) {
        if (elapsed < 1.2) return;
      } else if (!hit.has(target.id) && target.isAlive() && elapsed < 3) {
        return;
      }

      TimerUtils.releaseTimer(t);
      swarm.destroy();
      at.destroy();
    });
  }
}
