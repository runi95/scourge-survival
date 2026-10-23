import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// A barbed spear flies at the farthest enemy within 800 and hooks it, and its
// chain reels the enemy back to the hero. The hooked enemy is cut on the hook,
// and every enemy it is dragged through is cut and slowed
export class BarbedHook extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0CE");
  public readonly merchantItemTypeId = FourCC("I0CF");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I05R")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly slowAbilityId: number = FourCC("A054");

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
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const hero = vehicle.unit;
      let farthest: Unit | undefined;
      let farthestDistance = 0;
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
        if (farthest != null && d <= farthestDistance) return;
        farthest = u;
        farthestDistance = d;
      });
      grp.destroy();
      if (farthest == null) return;

      this.throwSpear(hero, owner, farthest);
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

  // The spear flies at 1600 a second on its chain until it reaches the target
  private throwSpear(hero: Unit, owner: MapPlayer, target: Unit): void {
    let x = hero.x;
    let y = hero.y;
    const spear = Effect.create(
      "Abilities/Weapons/DryadMissile/DryadMissile.mdl",
      x,
      y,
    );
    spear.setHeight(60);
    const chain = AddLightningEx("LEAS", false, x, y, 60, x, y, 60);

    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      if (!target.isAlive()) {
        TimerUtils.releaseTimer(t);
        spear.destroy();
        DestroyLightning(chain);
        return;
      }

      const angle = Math.atan2(target.y - y, target.x - x);
      const left = Math.sqrt((target.x - x) ** 2 + (target.y - y) ** 2);
      const step = Math.min(50, left);
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
      spear.x = x;
      spear.y = y;
      spear.setYaw(angle);
      MoveLightningEx(chain, false, hero.x, hero.y, 60, x, y, 60);
      if (step < left) return;

      TimerUtils.releaseTimer(t);
      this.reel(hero, owner, target, spear, chain);
    });
  }

  // Drags the hooked enemy at 900 a second until it is 100 from the hero
  private reel(
    hero: Unit,
    owner: MapPlayer,
    hooked: Unit,
    spear: Effect,
    chain: lightning,
  ): void {
    this.cut(owner, hooked, 200);
    const distance = Math.sqrt(
      (hooked.x - hero.x) ** 2 + (hooked.y - hero.y) ** 2,
    );
    StunUtils.stunUnit(hooked.handle, distance / 900 + 0.25);

    const cut = new Set<number>([hooked.id]);
    const at = Point.create(hooked.x, hooked.y);
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      const left = Math.sqrt(
        (hero.x - hooked.x) ** 2 + (hero.y - hooked.y) ** 2,
      );
      if (!hooked.isAlive() || left <= 100 || elapsed >= 2) {
        TimerUtils.releaseTimer(t);
        at.destroy();
        spear.destroy();
        DestroyLightning(chain);
        return;
      }

      const angle = Math.atan2(hero.y - hooked.y, hero.x - hooked.x);
      const step = Math.min(28, left - 100);
      const x = hooked.x + step * Math.cos(angle);
      const y = hooked.y + step * Math.sin(angle);
      hooked.x = x;
      hooked.y = y;
      spear.x = x;
      spear.y = y;
      spear.setYaw(angle + Math.PI);
      MoveLightningEx(chain, false, hero.x, hero.y, 60, x, y, 60);

      at.setPosition(x, y);
      const grp = Group.fromRange(150, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (cut.has(u.id)) return;

        cut.add(u.id);
        this.cut(owner, u, 150);
      });
      grp.destroy();
    });
  }

  private cut(owner: MapPlayer, u: Unit, damage: number): void {
    const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.slowAbilityId);
    dummy.issueTargetOrder("slow", u);
    dummy.damageTarget(
      u.handle,
      damage,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    Effect.createAttachment(
      "Objects/Spawnmodels/Critters/Little_Blood/LittleBloodExplosion.mdl",
      u,
      "chest",
    ).destroy();
  }
}
