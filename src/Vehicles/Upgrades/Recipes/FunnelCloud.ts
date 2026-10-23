import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Cloud {
  prey: Unit;
  funnel: Effect;
  timer: Timer;
  ticks: number;
  strikes: number;
}

// A dark funnel cloud stalks its prey like an assassin. Every 3 seconds a new
// cloud singles out the enemy with the most life within 800 that no cloud is
// hunting yet and follows it, touching down on it as a twister at once and
// every 3 seconds after for 9 seconds (4 strikes): 150 to the prey and 75 to
// every other enemy within 250, all hurled into the air and stunned for 1s.
// When the prey dies, the cloud picks the enemy with the most life within 600
// of it and hunts that one for the strikes it has left
export class FunnelCloud extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0E2");
  public readonly merchantItemTypeId = FourCC("I0E3");
  public readonly recipe: number[] = [FourCC("I00X"), FourCC("I05Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly clouds = new Map<number, Cloud[]>();
  // Enemies in the air right now, by handle id
  private readonly tossed = new Set<number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const clouds: Cloud[] = [];
    this.clouds.set(itemId, clouds);
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const prey = this.findPrey(owner, clouds, vehicle.unit.point, 800);
      if (prey == null) return;
      this.gather(vehicle, owner, clouds, prey);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, tick);
    tick();
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

    const clouds = this.clouds.get(itemId);
    this.clouds.delete(itemId);
    if (clouds == null) return;
    for (const cloud of [...clouds]) this.disperse(clouds, cloud);
  }

  // The enemy with the most life within range of a point that no cloud of
  // this item hunts yet
  private findPrey(
    owner: MapPlayer,
    clouds: Cloud[],
    at: Point,
    range: number,
  ): Unit | undefined {
    let best: Unit | undefined;
    let bestLife = 0;
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      for (const c of clouds) if (c.prey === u) return;
      if (u.life <= bestLife) return;

      best = u;
      bestLife = u.life;
    });
    grp.destroy();
    return best;
  }

  private gather(
    vehicle: Vehicle,
    owner: MapPlayer,
    clouds: Cloud[],
    prey: Unit,
  ): void {
    const funnel = Effect.create(
      "Abilities/Spells/Other/Tornado/TornadoElementalSmall.mdl",
      prey.x,
      prey.y,
    );
    funnel.scale = 0.7;
    funnel.setColor(70, 60, 90);
    funnel.setHeight(350);
    const cloud: Cloud = {
      prey,
      funnel,
      timer: TimerUtils.newTimer(),
      ticks: 0,
      strikes: 0,
    };
    clouds.push(cloud);
    this.strike(vehicle, owner, cloud);

    cloud.timer.start(0.1, true, () => {
      if (!cloud.prey.isAlive()) {
        const at = Point.create(cloud.funnel.x, cloud.funnel.y);
        const next = this.findPrey(owner, clouds, at, 600);
        at.destroy();
        if (next == null) {
          this.disperse(clouds, cloud);
          return;
        }
        cloud.prey = next;
      }
      // The cloud drifts after its prey at up to 400 a second
      const dx = cloud.prey.x - cloud.funnel.x;
      const dy = cloud.prey.y - cloud.funnel.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const step = Math.min(d, 40);
      if (d > 0) {
        cloud.funnel.x += (dx / d) * step;
        cloud.funnel.y += (dy / d) * step;
        cloud.funnel.setHeight(350);
      }
      cloud.ticks++;
      if (cloud.ticks % 30 !== 0) return;

      this.strike(vehicle, owner, cloud);
      if (cloud.strikes >= 4) this.disperse(clouds, cloud);
    });
  }

  private disperse(clouds: Cloud[], cloud: Cloud): void {
    const i = clouds.indexOf(cloud);
    if (i < 0) return;
    clouds.splice(i, 1);
    TimerUtils.releaseTimer(cloud.timer);
    cloud.funnel.destroy();
  }

  // The twister touches down on the prey: 150 to it, 75 to every other enemy
  // within 250, all hurled into the air and stunned for 1s
  private strike(vehicle: Vehicle, owner: MapPlayer, cloud: Cloud): void {
    cloud.strikes++;
    const hero = vehicle.unit;
    const prey = cloud.prey;
    const { x, y } = prey;
    cloud.funnel.x = x;
    cloud.funnel.y = y;
    Effect.create(
      "Abilities/Spells/Other/Tornado/Tornado_Target.mdl",
      x,
      y,
    ).destroy();
    Effect.create(
      "Objects/Spawnmodels/Undead/ImpaleTargetDust/ImpaleTargetDust.mdl",
      x,
      y,
    ).destroy();

    const struck: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(250, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      struck.push(u);
    });
    grp.destroy();
    at.destroy();
    if (struck.indexOf(prey) < 0 && prey.isAlive()) struck.push(prey);

    for (const u of struck) {
      hero.damageTarget(
        u.handle,
        u === prey ? 150 : 75,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) this.toss(u);
    }
  }

  // Hurled 200 up and back down over 1s, stunned meanwhile (flyers only
  // stunned)
  private toss(u: Unit): void {
    StunUtils.stunUnit(u.handle, 1);
    if (u.isUnitType(UNIT_TYPE_FLYING)) return;
    if (this.tossed.has(u.id)) return;
    this.tossed.add(u.id);
    // Crow Form on and off lets a ground unit's height change
    u.addAbility(FourCC("Amrf"));
    u.removeAbility(FourCC("Amrf"));
    const baseHeight = u.getflyHeight();
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      const progress = Math.min(1, elapsed / 1);
      if (u.isAlive()) {
        u.setflyHeight(baseHeight + 200 * Math.sin(progress * Math.PI), 0);
      }
      if (progress < 1) return;

      TimerUtils.releaseTimer(t);
      u.setflyHeight(baseHeight, 0);
      this.tossed.delete(u.id);
    });
  }
}
