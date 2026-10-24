import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Caught {
  unit: Unit;
  baseHeight: number;
  net: Effect;
}

// Every 4 seconds a rocket (0.5 s flight) at the enemy within 800 with the
// most enemies within 200 of it. Every enemy unit within 200 of it is lifted
// 250 and stunned for 1.5 s, then dropped: 80 to it and 40 to every other
// enemy unit within 150 of where it lands
export class SkyNet extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I09K");
  public readonly merchantItemTypeId = FourCC("I09L");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I05G")];

  private readonly timers = new Map<number, Timer>();
  private readonly crowFormAbilityId: number = FourCC("Amrf");

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
      const enemies = this.enemies(hero.x, hero.y, 800, owner);
      if (enemies.length === 0) return;
      let center = enemies[0];
      let most = 0;
      for (const u of enemies) {
        let n = 0;
        for (const v of enemies) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          if (dx * dx + dy * dy <= 200 * 200) n++;
        }
        if (n > most) {
          center = u;
          most = n;
        }
      }
      this.fire(hero, owner, center);
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

  // The rocket flies to the target with the net
  private fire(hero: Unit, owner: MapPlayer, target: Unit) {
    const sx = hero.x;
    const sy = hero.y;
    const rocket = Effect.create(
      "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
      sx,
      sy,
    );
    let step = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      const tx = target.x;
      const ty = target.y;
      rocket.setYaw(Atan2(ty - sy, tx - sx));
      rocket.x = sx + ((tx - sx) * step) / 10;
      rocket.y = sy + ((ty - sy) * step) / 10;
      rocket.setHeight(50 + 200 * Math.sin((Math.PI * step) / 20));
      if (step < 10) return;
      TimerUtils.releaseTimer(t);
      rocket.destroy();
      this.hoist(hero, owner, tx, ty);
    });
  }

  private hoist(hero: Unit, owner: MapPlayer, x: number, y: number) {
    const caught: Caught[] = [];
    for (const unit of this.enemies(x, y, 200, owner)) {
      const baseHeight = unit.getflyHeight();
      if (unit.addAbility(this.crowFormAbilityId)) {
        unit.removeAbility(this.crowFormAbilityId);
      }
      unit.setflyHeight(baseHeight + 250, 500);
      StunUtils.stunUnit(unit.handle, 1.5);
      const net = Effect.createAttachment(
        "Abilities/Spells/Orc/Ensnare/ensnareTarget.mdl",
        unit,
        "origin",
      );
      caught.push({ unit, baseHeight, net });
    }
    if (caught.length === 0) return;

    const t = TimerUtils.newTimer();
    t.start(1.5, false, () => {
      TimerUtils.releaseTimer(t);
      for (const { unit, baseHeight, net } of caught) {
        net.destroy();
        if (!unit.isAlive()) continue;
        unit.setflyHeight(baseHeight, 0);
        Effect.create(
          "Objects/Spawnmodels/Undead/ImpaleTargetDust/ImpaleTargetDust.mdl",
          unit.x,
          unit.y,
        ).destroy();
        hero.damageTarget(
          unit.handle,
          80,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        for (const u of this.enemies(unit.x, unit.y, 150, owner)) {
          if (u === unit) continue;
          hero.damageTarget(
            u.handle,
            40,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        }
      }
    });
  }

  // The visible enemy units within range of (x, y)
  private enemies(x: number, y: number, range: number, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }
}
