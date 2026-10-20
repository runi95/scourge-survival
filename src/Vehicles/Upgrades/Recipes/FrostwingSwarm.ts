import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class FrostwingSwarm extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0AK");
  public readonly merchantItemTypeId = FourCC("I0AL");
  public readonly recipe: number[] = [FourCC("I041"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chillAbilityId: number = FourCC("A04W");
  private readonly frostBuffId: number = FourCC("Bfro");

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

      if (enemies.length === 0) return;

      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      this.fly(owner, vehicle.unit, target.x, target.y);
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

  private fly(
    owner: MapPlayer,
    hero: Unit,
    towardsX: number,
    towardsY: number,
  ) {
    let x = hero.x;
    let y = hero.y;
    const out = Math.atan2(towardsY - y, towardsX - x);
    const swarm = Effect.create(
      "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmMissile.mdl",
      x,
      y,
    );
    swarm.setColor(150, 200, 255);
    swarm.setHeight(60);
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);

    const at = Point.create(x, y);
    const bitten = new Set<number>();
    let returning = false;
    let travelled = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      const angle = returning ? Math.atan2(hero.y - y, hero.x - x) : out;
      x += 1000 * 0.03 * Math.cos(angle);
      y += 1000 * 0.03 * Math.sin(angle);
      travelled += 1000 * 0.03;
      swarm.x = x;
      swarm.y = y;
      swarm.setYaw(angle);
      at.setPosition(x, y);

      const grp = Group.fromRange(150, at);
      grp.for((u) => {
        if (bitten.has(u.id)) return;
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        bitten.add(u.id);
        const chilled = returning && u.getAbilityLevel(this.frostBuffId) > 0;
        dummy.damageTarget(
          u.handle,
          chilled ? 80 : 40,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (returning) return;

        const chiller = Unit.create(owner, this.dummyUnitId, x, y);
        chiller.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        chiller.addAbility(this.chillAbilityId);
        chiller.issueTargetOrder(OrderId.Slow, u);
      });
      grp.destroy();

      if (!returning) {
        if (travelled < 800) return;
        returning = true;
        bitten.clear();
        return;
      }
      const left = (hero.x - x) * (hero.x - x) + (hero.y - y) * (hero.y - y);
      if (left > 60 * 60 && travelled < 2400) return;

      TimerUtils.releaseTimer(t);
      swarm.destroy();
      at.destroy();
    });
  }
}
