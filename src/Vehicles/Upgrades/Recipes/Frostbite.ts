import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Bite {
  hero: Unit;
  owner: MapPlayer;
  // Where it stood last time, how far it has walked and how long is left
  x: number;
  y: number;
  walked: number;
  // Attacks it started since the last check, as distance
  cracked: number;
  left: number;
  effect: Effect;
}

// Every 1.25 seconds a bullet at the farthest enemy within 1500 of the hero:
// 80 + 10 for every 100 of distance (up to 230 at 1500), and frostbite for
// 8 s. Every 0.25 s a frostbitten enemy takes 50 for every 100 it moved, and
// every attack it starts counts as 100 moved. Once it has moved 300 it is
// frozen for 2 s and takes 150, the frostbite ends, and every enemy within
// 250 of it that isn't frostbitten is frostbitten
export class Frostbite extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.25;
  public readonly itemTypeId = FourCC("I06M");
  public readonly merchantItemTypeId = FourCC("I06N");
  public readonly recipe: number[] = [FourCC("I05E"), FourCC("I00Y")];

  private readonly timers = new Map<number, Timer>();
  // Frostbitten enemies, whoever bit them
  private readonly bites = new Map<Unit, Bite>();
  private biteTimer: Timer | undefined;
  private attackTrigger: Trigger;

  public onInitialize(): void {
    this.attackTrigger = Trigger.create();
    this.attackTrigger.addAction(() => {
      const attacker = Unit.fromHandle(GetAttacker());
      const bite = this.bites.get(attacker);
      if (bite == null) return;
      // Swinging cracks the ice as much as 100 steps
      bite.cracked += 100;
    });
    this.attackTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_ATTACKED);
  }

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
      let farthest = 0;
      const grp = Group.fromRange(1500, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (dx * dx + dy * dy > farthest) {
          target = u;
          farthest = dx * dx + dy * dy;
        }
      });
      grp.destroy();
      if (target == null) return;
      this.shoot(hero, owner, target, Math.sqrt(farthest));
    });

    if (this.biteTimer == null) {
      this.biteTimer = TimerUtils.newTimer();
      this.biteTimer.start(0.25, true, () => this.gnaw());
    }
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

  private shoot(hero: Unit, owner: MapPlayer, target: Unit, distance: number) {
    const bullet = Effect.create(
      "Abilities/Weapons/ColdArrow/ColdArrowMissile.mdl",
      hero.x,
      hero.y,
    );
    bullet.z = 60;
    bullet.setYaw(Atan2(target.y - hero.y, target.x - hero.x));
    let x = hero.x;
    let y = hero.y;

    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 75 && target.isAlive()) {
        x += (75 * dx) / d;
        y += (75 * dy) / d;
        bullet.x = x;
        bullet.y = y;
        return;
      }
      TimerUtils.releaseTimer(t);
      bullet.destroy();
      if (!target.isAlive()) return;

      hero.damageTarget(
        target.handle,
        80 + distance / 10,
        false,
        false,
        ATTACK_TYPE_PIERCE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (target.isAlive()) this.bite(hero, owner, target);
    });
  }

  private bite(hero: Unit, owner: MapPlayer, target: Unit) {
    const bite = this.bites.get(target);
    if (bite != null) {
      bite.left = 8;
      return;
    }
    this.bites.set(target, {
      hero,
      owner,
      x: target.x,
      y: target.y,
      walked: 0,
      cracked: 0,
      left: 8,
      effect: Effect.createAttachment(
        "Abilities/Spells/Undead/FrostArmor/FrostArmorDamage.mdl",
        target,
        "chest",
      ),
    });
  }

  private gnaw() {
    const frozen: Unit[] = [];
    const over: Unit[] = [];
    this.bites.forEach((bite, u) => {
      bite.left -= 0.25;
      if (!u.isAlive() || bite.left <= 0) {
        over.push(u);
        return;
      }
      const moved =
        Math.sqrt((u.x - bite.x) ** 2 + (u.y - bite.y) ** 2) + bite.cracked;
      bite.x = u.x;
      bite.y = u.y;
      bite.cracked = 0;
      if (moved < 1) return;
      bite.walked += moved;
      bite.hero.damageTarget(
        u.handle,
        moved / 2,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (bite.walked >= 300) frozen.push(u);
    });
    for (const u of over) {
      this.bites.get(u).effect.destroy();
      this.bites.delete(u);
    }

    for (const u of frozen) {
      const bite = this.bites.get(u);
      this.bites.delete(u);
      bite.effect.destroy();
      Effect.create(
        "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
        u.x,
        u.y,
      ).destroy();
      bite.hero.damageTarget(
        u.handle,
        150,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) StunUtils.freezeUnit(u, 2, false, false, false, false);

      // The frost spreads
      const grp = Group.fromRange(250, u.point);
      grp.for((v) => {
        if (v === u) return;
        if (!v.isAlive()) return;
        if (!v.isEnemy(bite.owner)) return;
        if (v.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (this.bites.has(v)) return;

        this.bite(bite.hero, bite.owner, v);
      });
      grp.destroy();
    }
  }
}
