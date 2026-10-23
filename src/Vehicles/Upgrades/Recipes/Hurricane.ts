import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Tree {
  trunk: Effect;
  wind: Effect;
  // When this tree last hit every enemy, by handle id
  hits: Map<number, number>;
}

interface Storm {
  trees: Tree[];
  elapsed: number;
  timers: Timer[];
}

// The hero is the eye of a hurricane that has torn up 3 Treants. They whirl
// around it, one turn every 2 seconds, their orbit breathing out from 100 to
// 650 and back every 5 seconds. A whirling Treant that crashes into an enemy
// (within 100 of it, each enemy at most every 0.5s per Treant) batters it for
// 85 and flings it 150 away from the hero, stunned for 0.5s
export class Hurricane extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0DC");
  public readonly merchantItemTypeId = FourCC("I0DD");
  public readonly recipe: number[] = [FourCC("I05N"), FourCC("I00X")];

  private readonly storms = new Map<number, Storm>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hero = vehicle.unit;
    const storm: Storm = { trees: [], elapsed: 0, timers: [] };
    this.storms.set(itemId, storm);
    for (let i = 0; i < 3; i++) {
      const trunk = Effect.create("Units/NightElf/Ent/Ent.mdl", hero.x, hero.y);
      trunk.scale = 0.9;
      trunk.playAnimation(ANIM_TYPE_WALK);
      const wind = Effect.create(
        "Abilities/Spells/NightElf/Cyclone/CycloneTarget.mdl",
        hero.x,
        hero.y,
      );
      storm.trees.push({ trunk, wind, hits: new Map() });
    }

    const cycle = TimerUtils.newTimer();
    cycle.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
    });
    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    let ticks = 0;
    const whirl = TimerUtils.newTimer();
    whirl.start(0.03125, true, () => {
      storm.elapsed += 0.03125;
      ticks++;
      const t = storm.elapsed;
      const radius = 375 - 275 * Math.cos((2 * Math.PI * t) / 5);
      const { x, y } = vehicle.unit;
      for (let i = 0; i < storm.trees.length; i++) {
        const tree = storm.trees[i];
        const angle = Math.PI * t + (i * 2 * Math.PI) / 3;
        const tx = x + radius * Math.cos(angle);
        const ty = y + radius * Math.sin(angle);
        tree.trunk.x = tx;
        tree.trunk.y = ty;
        tree.trunk.setHeight(60);
        tree.trunk.setYaw(angle + Math.PI / 2);
        tree.wind.x = tx;
        tree.wind.y = ty;
        if (ticks % 4 === 0) this.crash(vehicle, owner, tree, tx, ty, t);
      }
    });
    storm.timers.push(cycle, whirl);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const storm = this.storms.get(itemId);
    this.storms.delete(itemId);
    if (storm == null) return;
    for (const t of storm.timers) TimerUtils.releaseTimer(t);
    storm.timers.length = 0;
    for (const tree of storm.trees) {
      tree.trunk.setAlpha(0);
      tree.trunk.destroy();
      tree.wind.destroy();
    }
    storm.trees.length = 0;
  }

  private crash(
    vehicle: Vehicle,
    owner: MapPlayer,
    tree: Tree,
    x: number,
    y: number,
    now: number,
  ): void {
    const hero = vehicle.unit;
    const at = Point.create(x, y);
    const struck: Unit[] = [];
    const grp = Group.fromRange(100, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      const last = tree.hits.get(u.id);
      if (last != null && now - last < 0.5) return;

      struck.push(u);
    });
    grp.destroy();
    at.destroy();

    for (const u of struck) {
      tree.hits.set(u.id, now);
      hero.damageTarget(
        u.handle,
        85,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) this.fling(hero, u);
    }
    // Forget enemies hit long ago
    if (tree.hits.size > 50) tree.hits = new Map();
  }

  // Flung 150 away from the hero over 0.25s, stunned for 0.5s
  private fling(hero: Unit, u: Unit): void {
    StunUtils.stunUnit(u.handle, 0.5);
    const angle = Math.atan2(u.y - hero.y, u.x - hero.x);
    const step = (150 / 0.25) * 0.03125;
    let flown = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      flown += 0.03125;
      const nx = u.x + step * Math.cos(angle);
      const ny = u.y + step * Math.sin(angle);
      if (
        u.isAlive() &&
        (u.isUnitType(UNIT_TYPE_FLYING) ||
          !IsTerrainPathable(nx, ny, PATHING_TYPE_WALKABILITY))
      ) {
        u.x = nx;
        u.y = ny;
      }
      if (flown < 0.25) return;
      TimerUtils.releaseTimer(t);
      Effect.create(
        "Objects/Spawnmodels/Undead/ImpaleTargetDust/ImpaleTargetDust.mdl",
        u.x,
        u.y,
      ).destroy();
    });
  }
}
