import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 1.5 seconds a shot at the nearest enemy within 600. It lands where
// the target stood and skips on 3 times along the line from the hero, 200
// further each time, every skip a lower arc. Every landing does 65 to every
// enemy within 120 and stuns it for 0.75 s
export class SkippingShot extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I062");
  public readonly merchantItemTypeId = FourCC("I063");
  public readonly recipe: number[] = [FourCC("I000"), FourCC("I05D")];

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

      let target: Unit | undefined;
      let nearest = 0;
      const grp = Group.fromRange(600, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (target == null || dx * dx + dy * dy < nearest) {
          target = u;
          nearest = dx * dx + dy * dy;
        }
      });
      grp.destroy();
      if (target == null) return;
      this.fire(hero, owner, target.x, target.y);
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

  private fire(hero: Unit, owner: MapPlayer, tx: number, ty: number) {
    const radians = Atan2(ty - hero.y, tx - hero.x);
    const ca = Math.cos(radians);
    const sa = Math.sin(radians);
    const shot = Effect.create(
      "Abilities/Weapons/CannonTowerMissile/CannonTowerMissile.mdl",
      hero.x,
      hero.y,
    );
    shot.setYaw(radians);
    // The landings: the target's spot, then 3 skips 200 apart
    let fromX = hero.x;
    let fromY = hero.y;
    let landing = 0;
    let step = 0;

    const t = TimerUtils.newTimer();
    t.start(0.04, true, () => {
      const toX = tx + 200 * landing * ca;
      const toY = ty + 200 * landing * sa;
      const length = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
      const steps = Math.max(4, Math.ceil(length / 40));
      step++;
      const f = step / steps;
      shot.x = fromX + (toX - fromX) * f;
      shot.y = fromY + (toY - fromY) * f;
      // Every skip a lower arc
      shot.z = 30 + 4 * (240 - 60 * landing) * f * (1 - f);
      if (step < steps) return;

      this.land(hero, owner, toX, toY);
      step = 0;
      fromX = toX;
      fromY = toY;
      landing++;
      if (landing < 4) return;
      TimerUtils.releaseTimer(t);
      shot.destroy();
    });
  }

  private land(hero: Unit, owner: MapPlayer, x: number, y: number) {
    Effect.create(
      "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
      x,
      y,
    ).destroy();
    const at = Point.create(x, y);
    const grp = Group.fromRange(120, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      hero.damageTarget(
        u.handle,
        65,
        false,
        false,
        ATTACK_TYPE_SIEGE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) StunUtils.stunUnit(u.handle, 0.75);
    });
    grp.destroy();
    at.destroy();
  }
}
