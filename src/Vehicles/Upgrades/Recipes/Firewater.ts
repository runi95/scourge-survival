import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Soak {
  // Seconds left drenched or burning
  drenched: number;
  burning: number;
  effect: Effect | undefined;
  fire: Effect | undefined;
}

interface Brewery {
  slams: Timer;
  breaths: Timer;
}

// Every 3 seconds a thunder clap (A03Z: 60, slowed 3 s) around the hero when
// an enemy ground unit is within 300; every enemy ground unit within 250 is
// drenched for 6 s. Every 1.25 seconds a cone of fire 600 long and 30 degrees
// to either side towards the enemy within 600 with the most drenched enemies
// within 250 of it (or the nearest enemy): 80 to every enemy in it, and every
// drenched one in it also burns for 40 a second for 5 s
export class Firewater extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I06U");
  public readonly merchantItemTypeId = FourCC("I06V");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I05C")];

  private readonly breweries = new Map<number, Brewery>();
  private readonly soaks = new Map<Unit, Soak>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly clapAbilityId: number = FourCC("A03Z");
  // Whose hero the fires burn for, by enemy
  private readonly burners = new Map<Unit, Unit>();
  private soakTimer: Timer | undefined;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const slams = TimerUtils.newTimer();
    slams.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const drenched: Unit[] = [];
      let found = false;
      const grp = Group.fromRange(300, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        found = true;
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (dx * dx + dy * dy <= 250 * 250) drenched.push(u);
      });
      grp.destroy();
      if (!found) return;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.clapAbilityId);
      dummy.issueImmediateOrder("thunderclap");
      Effect.create(
        "Abilities/Spells/Other/StrongDrink/BrewmasterMissile.mdl",
        hero.x,
        hero.y,
      ).destroy();
      for (const u of drenched) this.drench(u);
    });

    const breaths = TimerUtils.newTimer();
    breaths.start(1.25, true, () => this.breathe(vehicle.unit, owner));

    this.breweries.set(itemId, { slams, breaths });
    if (this.soakTimer == null) {
      this.soakTimer = TimerUtils.newTimer();
      this.soakTimer.start(0.5, true, () => this.soak());
    }
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const brewery = this.breweries.get(itemId);
    this.breweries.delete(itemId);
    if (brewery == null) return;
    TimerUtils.releaseTimer(brewery.slams);
    TimerUtils.releaseTimer(brewery.breaths);
  }

  private drench(u: Unit) {
    let soak = this.soaks.get(u);
    if (soak == null) {
      soak = { drenched: 0, burning: 0, effect: undefined, fire: undefined };
      this.soaks.set(u, soak);
    }
    soak.drenched = 6;
    if (soak.effect == null) {
      soak.effect = Effect.createAttachment(
        "Abilities/Spells/Other/StrongDrink/BrewmasterTarget.mdl",
        u,
        "overhead",
      );
    }
  }

  private breathe(hero: Unit, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    if (enemies.length === 0) return;

    let target = enemies[0];
    let best = -1;
    for (const u of enemies) {
      let drenched = 0;
      for (const v of enemies) {
        if (!this.isDrenched(v)) continue;
        if ((v.x - u.x) ** 2 + (v.y - u.y) ** 2 <= 250 * 250) drenched++;
      }
      // The nearest breaks a tie, and is the target when none is drenched
      const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
      const score = drenched * 1000000000 - d;
      if (best < 0 || score > best) {
        target = u;
        best = score;
      }
    }

    const radians = Atan2(target.y - hero.y, target.x - hero.x);
    for (let i = 1; i <= 4; i++) {
      const flame = Effect.create(
        "Abilities/Spells/Other/BreathOfFire/BreathOfFireMissile.mdl",
        hero.x + 150 * i * Math.cos(radians),
        hero.y + 150 * i * Math.sin(radians),
      );
      flame.setYaw(radians);
      flame.destroy();
    }
    for (const u of enemies) {
      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      let off = Math.abs(Atan2(dy, dx) - radians);
      if (off > Math.PI) off = 2 * Math.PI - off;
      if (off > Math.PI / 6 && dx * dx + dy * dy > 100 * 100) continue;

      hero.damageTarget(
        u.handle,
        80,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive() || !this.isDrenched(u)) continue;
      const soak = this.soaks.get(u);
      soak.burning = 5;
      this.burners.set(u, hero);
      if (soak.fire == null) {
        soak.fire = Effect.createAttachment(
          "Abilities/Spells/Other/BreathOfFire/BreathOfFireDamage.mdl",
          u,
          "chest",
        );
      }
    }
  }

  private isDrenched(u: Unit): boolean {
    const soak = this.soaks.get(u);
    return soak != null && soak.drenched > 0;
  }

  private soak() {
    const done: Unit[] = [];
    this.soaks.forEach((soak, u) => {
      if (!u.isAlive()) {
        done.push(u);
        return;
      }
      soak.drenched -= 0.5;
      if (soak.burning > 0) {
        soak.burning -= 0.5;
        const hero = this.burners.get(u);
        if (hero != null) {
          hero.damageTarget(
            u.handle,
            20,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        }
      }
      if (soak.drenched <= 0 && soak.effect != null) {
        soak.effect.destroy();
        soak.effect = undefined;
      }
      if (soak.burning <= 0 && soak.fire != null) {
        soak.fire.destroy();
        soak.fire = undefined;
      }
      if (soak.drenched <= 0 && soak.burning <= 0) done.push(u);
    });
    for (const u of done) {
      const soak = this.soaks.get(u);
      if (soak.effect != null) soak.effect.destroy();
      if (soak.fire != null) soak.fire.destroy();
      this.soaks.delete(u);
      this.burners.delete(u);
    }
  }
}
