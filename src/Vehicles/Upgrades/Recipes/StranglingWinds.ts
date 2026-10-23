import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Held {
  unit: Unit;
  angle: number;
  radius: number;
  baseHeight: number;
  vines: Effect;
}

interface Storm {
  x: number;
  y: number;
  funnel: Effect;
  held: Held[];
  timer: Timer;
}

// Every 7 seconds a storm full of whipping vines settles on the largest group
// of enemy ground units within 800 and stays there for 6 seconds. Every enemy
// ground unit within 400 of its eye, and every one walking in later, is caught
// by the vines and held in the winds: lifted off its feet, it circles the eye
// (one turn every 2 seconds, the circle closing in at 50 a second down to 100),
// can't move or fight and is strangled for 80 a second. When the storm dies
// down it lets go of them all in a heap at its eye
export class StranglingWinds extends WeaponUpgradeRecipe {
  public readonly cooldown = 7;
  public readonly itemTypeId = FourCC("I0EA");
  public readonly merchantItemTypeId = FourCC("I0EB");
  public readonly recipe: number[] = [FourCC("I00X"), FourCC("I05P")];

  private readonly timers = new Map<number, Timer>();
  private readonly storms = new Map<number, Storm[]>();
  // Enemies held by any storm, by handle id
  private readonly caught = new Set<number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const storms: Storm[] = [];
    this.storms.set(itemId, storms);
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const target = this.largestGroup(vehicle.unit, owner);
      if (target == null) return;
      this.gather(vehicle.unit, owner, storms, target.x, target.y);
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

    const storms = this.storms.get(itemId);
    this.storms.delete(itemId);
    if (storms == null) return;
    for (const storm of [...storms]) this.calm(storms, storm);
  }

  private groundEnemiesAround(
    owner: MapPlayer,
    x: number,
    y: number,
    radius: number,
  ): Unit[] {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }

  // The visible enemy ground unit within 800 of the hero with the most enemy
  // ground units within 300 of it
  private largestGroup(hero: Unit, owner: MapPlayer): Unit | undefined {
    const enemies = this.groundEnemiesAround(owner, hero.x, hero.y, 800);
    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      if (!u.isVisible(owner)) continue;
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - u.x;
        const dy = other.y - u.y;
        if (dx * dx + dy * dy <= 300 * 300) count++;
      }
      if (count <= most) continue;
      most = count;
      best = u;
    }
    return best;
  }

  private gather(
    hero: Unit,
    owner: MapPlayer,
    storms: Storm[],
    x: number,
    y: number,
  ): void {
    const funnel = Effect.create(
      "Abilities/Spells/Other/Tornado/TornadoElemental.mdl",
      x,
      y,
    );
    funnel.setColor(150, 220, 120);
    const storm: Storm = {
      x,
      y,
      funnel,
      held: [],
      timer: TimerUtils.newTimer(),
    };
    storms.push(storm);

    let elapsed = 0;
    let ticks = 0;
    storm.timer.start(0.03125, true, () => {
      elapsed += 0.03125;
      ticks++;
      if (ticks % 8 === 1) this.catchAndStrangle(hero, owner, storm, elapsed);
      this.whirl(storm);
      if (elapsed >= 6) this.calm(storms, storm);
    });
  }

  // Every 0.25s: catch every enemy ground unit within 400 of the eye that is
  // not held yet, and strangle every held one for 20
  private catchAndStrangle(
    hero: Unit,
    owner: MapPlayer,
    storm: Storm,
    elapsed: number,
  ): void {
    for (const u of this.groundEnemiesAround(owner, storm.x, storm.y, 400)) {
      if (this.caught.has(u.id)) continue;
      this.caught.add(u.id);
      // Crow Form on and off lets a ground unit's height change
      u.addAbility(FourCC("Amrf"));
      u.removeAbility(FourCC("Amrf"));
      StunUtils.stunUnit(u.handle, 6 - elapsed + 0.1);
      const dx = u.x - storm.x;
      const dy = u.y - storm.y;
      storm.held.push({
        unit: u,
        angle: Math.atan2(dy, dx),
        radius: Math.max(100, Math.sqrt(dx * dx + dy * dy)),
        baseHeight: u.getflyHeight(),
        vines: Effect.createAttachment(
          "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
          u,
          "origin",
        ),
      });
    }

    for (const h of [...storm.held]) {
      if (!h.unit.isAlive()) {
        this.letGo(storm, h);
        continue;
      }
      hero.damageTarget(
        h.unit.handle,
        20,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!h.unit.isAlive()) this.letGo(storm, h);
    }
  }

  // The held circle the eye, one turn every 2 seconds, 80 off the ground,
  // the circle closing in at 50 a second down to 100
  private whirl(storm: Storm): void {
    for (const h of storm.held) {
      if (!h.unit.isAlive()) continue;
      h.angle += Math.PI * 0.03125;
      h.radius = Math.max(100, h.radius - 50 * 0.03125);
      const nx = storm.x + h.radius * Math.cos(h.angle);
      const ny = storm.y + h.radius * Math.sin(h.angle);
      if (!IsTerrainPathable(nx, ny, PATHING_TYPE_WALKABILITY)) {
        h.unit.x = nx;
        h.unit.y = ny;
      }
      h.unit.setflyHeight(h.baseHeight + 80, 0);
      h.unit.facing = (h.angle * 180) / Math.PI + 90;
    }
  }

  private letGo(storm: Storm, h: Held): void {
    const i = storm.held.indexOf(h);
    if (i >= 0) storm.held.splice(i, 1);
    this.caught.delete(h.unit.id);
    h.vines.destroy();
    if (h.unit.isAlive()) h.unit.setflyHeight(h.baseHeight, 0);
  }

  // The storm dies down and drops everything it holds at its eye
  private calm(storms: Storm[], storm: Storm): void {
    const i = storms.indexOf(storm);
    if (i < 0) return;
    storms.splice(i, 1);
    TimerUtils.releaseTimer(storm.timer);
    for (const h of [...storm.held]) {
      if (h.unit.isAlive()) {
        Effect.create(
          "Objects/Spawnmodels/Undead/ImpaleTargetDust/ImpaleTargetDust.mdl",
          h.unit.x,
          h.unit.y,
        ).destroy();
      }
      this.letGo(storm, h);
    }
    storm.funnel.destroy();
  }
}
