import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Forge {
  anvil: Unit | undefined;
  // Seconds until the next elemental, and until the next hammer
  next: number;
  hammer: number;
  timer: Timer;
}

// Every 15 seconds a Water Elemental (h002, the base weapon's, 14 s) 300 from
// the hero towards the enemy within 900 with the most enemies within 300 of
// it (on walkable ground, or next to the hero). Every 3 seconds a storm
// hammer flies 1000 a second at the enemy within 700 of the hero farthest
// from the elemental: 100 and a 1 s stun. A ground unit is then knocked 900 a
// second into the elemental: 10 for every 100 it flew and a 1.5 s stun, and
// 50 to every enemy within 150 of the elemental
export class HammerAndAnvil extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I06G");
  public readonly merchantItemTypeId = FourCC("I06H");
  public readonly recipe: number[] = [FourCC("I00M"), FourCC("I05D")];

  private readonly forges = new Map<number, Forge>();
  private readonly elementalUnitId: number = FourCC("h002");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const forge: Forge = {
      anvil: undefined,
      next: 0,
      hammer: 1,
      timer: TimerUtils.newTimer(),
    };
    this.forges.set(itemId, forge);

    forge.timer.start(0.5, true, () => {
      const hero = vehicle.unit;
      forge.next -= 0.5;
      if (forge.next <= 0) {
        forge.next = this.cooldown;
        hero.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        this.raise(forge, owner, hero);
      }

      const anvil = forge.anvil;
      if (anvil == null || !anvil.isAlive()) return;
      forge.hammer -= 0.5;
      if (forge.hammer > 0) return;
      forge.hammer = 3;

      let target: Unit | undefined;
      let farthest = 0;
      const grp = Group.fromRange(700, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const dx = u.x - anvil.x;
        const dy = u.y - anvil.y;
        if (dx * dx + dy * dy > farthest) {
          target = u;
          farthest = dx * dx + dy * dy;
        }
      });
      grp.destroy();
      if (target == null) return;
      this.throwHammer(hero, owner, anvil, target);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const forge = this.forges.get(itemId);
    this.forges.delete(itemId);
    if (forge == null) return;
    TimerUtils.releaseTimer(forge.timer);
    if (forge.anvil != null) forge.anvil.kill();
  }

  private raise(forge: Forge, owner: MapPlayer, hero: Unit) {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(900, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    let group: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let around = 0;
      for (const v of enemies) {
        if ((v.x - u.x) ** 2 + (v.y - u.y) ** 2 <= 300 * 300) around++;
      }
      if (around > most) {
        group = u;
        most = around;
      }
    }

    let x = hero.x + 150;
    let y = hero.y;
    if (group != null) {
      const radians = Atan2(group.y - hero.y, group.x - hero.x);
      x = hero.x + 300 * Math.cos(radians);
      y = hero.y + 300 * Math.sin(radians);
      if (IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) {
        x = hero.x + 100 * Math.cos(radians);
        y = hero.y + 100 * Math.sin(radians);
      }
    }
    const anvil = Unit.create(owner, this.elementalUnitId, x, y);
    anvil.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
    anvil.setAnimation("birth");
    anvil.queueAnimation("stand");
    forge.anvil = anvil;
  }

  private throwHammer(hero: Unit, owner: MapPlayer, anvil: Unit, target: Unit) {
    const hammer = Effect.create(
      "Abilities/Spells/Human/StormBolt/StormBoltMissile.mdl",
      hero.x,
      hero.y,
    );
    hammer.z = 80;
    let x = hero.x;
    let y = hero.y;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 50 && target.isAlive()) {
        x += (50 * dx) / d;
        y += (50 * dy) / d;
        hammer.x = x;
        hammer.y = y;
        hammer.setYaw(Atan2(dy, dx));
        return;
      }
      TimerUtils.releaseTimer(t);
      hammer.destroy();
      if (!target.isAlive()) return;

      Effect.create(
        "Abilities/Spells/Human/StormBolt/StormBoltTarget.mdl",
        target.x,
        target.y,
      ).destroy();
      hero.damageTarget(
        target.handle,
        100,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!target.isAlive()) return;
      StunUtils.stunUnit(target.handle, 1);
      if (target.isUnitType(UNIT_TYPE_FLYING)) return;
      this.knock(hero, owner, anvil, target);
    });
  }

  // Into the anvil
  private knock(hero: Unit, owner: MapPlayer, anvil: Unit, target: Unit) {
    let flown = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      const dx = anvil.x - target.x;
      const dy = anvil.y - target.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (!target.isAlive() || !anvil.isAlive()) {
        TimerUtils.releaseTimer(t);
        return;
      }
      if (d > 100) {
        const x = target.x + (45 * dx) / d;
        const y = target.y + (45 * dy) / d;
        // Stopped by a cliff on the way
        if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) {
          target.x = x;
          target.y = y;
          flown += 45;
          return;
        }
      }
      TimerUtils.releaseTimer(t);

      Effect.create(
        "Objects/Spawnmodels/Naga/NagaDeath/NagaDeath.mdl",
        target.x,
        target.y,
      ).destroy();
      hero.damageTarget(
        target.handle,
        flown / 10,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (target.isAlive()) StunUtils.stunUnit(target.handle, 1.5);
      const at = Point.create(anvil.x, anvil.y);
      const grp = Group.fromRange(150, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hero.damageTarget(
          u.handle,
          50,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
      at.destroy();
    });
  }
}
