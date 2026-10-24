import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 7 seconds a boulder that comes down 1.5 s later on the enemy within
// 1200 with the most enemies within 300 of it (where it stood at the
// launch): 250 to every enemy unit in the middle, down to 100 at 400, a 1 s
// stun within 150, and every enemy ground unit within 400 thrown 150 outward
// over 0.3 s
export class Payload extends WeaponUpgradeRecipe {
  public readonly cooldown = 7;
  public readonly itemTypeId = FourCC("I08I");
  public readonly merchantItemTypeId = FourCC("I08J");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();

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
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(1200, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();
      if (enemies.length === 0) return;

      let center = enemies[0];
      let most = 0;
      for (const u of enemies) {
        let n = 0;
        for (const v of enemies) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          if (dx * dx + dy * dy <= 300 * 300) n++;
        }
        if (n > most) {
          center = u;
          most = n;
        }
      }
      const { x, y } = center;

      Effect.create(
        "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
        hero.x,
        hero.y,
      ).destroy();
      const mark = Effect.create(
        "Abilities/Spells/Human/Flare/FlareTarget.mdl",
        x,
        y,
      );
      const fall = Effect.create(
        "Abilities/Weapons/DemolisherMissile/DemolisherMissile.mdl",
        x,
        y,
      );
      fall.scale = 3;
      fall.setHeight(1500);
      let height = 1500;

      const drop = TimerUtils.newTimer();
      drop.start(0.05, true, () => {
        height -= 50;
        if (height > 0) {
          fall.setHeight(height);
          return;
        }
        TimerUtils.releaseTimer(drop);
        fall.destroy();
        mark.destroy();
        this.impact(hero, owner, x, y);
      });
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

  private impact(hero: Unit, owner: MapPlayer, x: number, y: number) {
    Effect.create(
      "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
      x,
      y,
    ).destroy();
    Effect.create(
      "Abilities/Spells/Human/Thunderclap/ThunderClapCaster.mdl",
      x,
      y,
    ).destroy();

    const thrown: { u: Unit; ca: number; sa: number }[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(400, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const dx = u.x - x;
      const dy = u.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      hero.damageTarget(
        u.handle,
        250 - (150 * d) / 400,
        false,
        false,
        ATTACK_TYPE_SIEGE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) return;
      if (d <= 150) StunUtils.stunUnit(u.handle, 1);
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;
      const radians = d > 0 ? Atan2(dy, dx) : GetRandomReal(0, 2 * Math.PI);
      thrown.push({ u, ca: Math.cos(radians), sa: Math.sin(radians) });
    });
    grp.destroy();
    at.destroy();
    if (thrown.length === 0) return;

    let steps = 0;
    const throwing = TimerUtils.newTimer();
    throwing.start(0.05, true, () => {
      for (const { u, ca, sa } of thrown) {
        if (!u.isAlive()) continue;
        u.x = u.x + 25 * ca;
        u.y = u.y + 25 * sa;
      }
      if (++steps < 6) return;
      TimerUtils.releaseTimer(throwing);
    });
  }
}
