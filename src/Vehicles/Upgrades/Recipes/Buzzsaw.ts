import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

// Fires a spinning buzzsaw into the largest enemy group within 800. For 4
// seconds it caroms from enemy to enemy inside the group, cutting every enemy
// it passes through, and drops when nobody is left within 350 of it
export class Buzzsaw extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0D8");
  public readonly merchantItemTypeId = FourCC("I0D9");
  public readonly recipe: number[] = [FourCC("I05R"), FourCC("I00N")];

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
      const target = this.largestGroup(hero, owner);
      if (target == null) return;

      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.launch(hero, owner, target.x, target.y);
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

  private enemiesAround(owner: MapPlayer, at: Point, radius: number): Unit[] {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    return enemies;
  }

  // The enemy within 800 of the hero with the most enemies within 250 of it
  private largestGroup(hero: Unit, owner: MapPlayer): Unit | undefined {
    const enemies = this.enemiesAround(owner, hero.point, 800);
    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - u.x;
        const dy = other.y - u.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= most) continue;
      most = count;
      best = u;
    }
    return best;
  }

  // The saw flies from the hero at 1200 a second, then moves at 800 a second
  // towards a nearby enemy it hasn't just cut, cutting every enemy within 100
  // of it for 70, each at most every 0.5 seconds
  private launch(hero: Unit, owner: MapPlayer, tx: number, ty: number): void {
    const saw = Effect.create(
      "Abilities/Weapons/GlaiveMissile/GlaiveMissile.mdl",
      hero.x,
      hero.y,
    );
    saw.scale = 1.5;
    const at = Point.create(hero.x, hero.y);
    const cuts = new Map<number, number>();
    const startX = hero.x;
    const startY = hero.y;
    const flight = Math.max(
      0.1,
      Math.sqrt((tx - startX) ** 2 + (ty - startY) ** 2) / 1200,
    );
    let x = startX;
    let y = startY;
    let target: Unit | undefined;
    let elapsed = 0;

    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      if (elapsed < flight) {
        const progress = elapsed / flight;
        x = startX + (tx - startX) * progress;
        y = startY + (ty - startY) * progress;
        saw.x = x;
        saw.y = y;
        saw.setHeight(40 + 250 * Math.sin(Math.PI * progress));
        return;
      }
      saw.setHeight(40);

      at.setPosition(x, y);
      if (target == null || !target.isAlive()) {
        const near = this.enemiesAround(owner, at, 350);
        const fresh = near.filter(
          (u) => elapsed - (cuts.get(u.id) ?? -1) >= 0.5,
        );
        const choices = fresh.length > 0 ? fresh : near;
        target =
          choices.length > 0
            ? choices[RandomNumberGenerator.random(0, choices.length - 1)]
            : undefined;
      }
      if (target == null || elapsed >= flight + 4) {
        saw.destroy();
        at.destroy();
        TimerUtils.releaseTimer(t);
        return;
      }

      const angle = Math.atan2(target.y - y, target.x - x);
      const left = Math.sqrt((target.x - x) ** 2 + (target.y - y) ** 2);
      const step = Math.min(25, left);
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
      saw.x = x;
      saw.y = y;
      saw.setYaw(angle);
      // Reached: the saw caroms off to someone else
      if (step === left) target = undefined;

      at.setPosition(x, y);
      for (const u of this.enemiesAround(owner, at, 100)) {
        if (elapsed - (cuts.get(u.id) ?? -1) < 0.5) continue;

        cuts.set(u.id, elapsed);
        hero.damageTarget(
          u.handle,
          70,
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
    });
  }
}
