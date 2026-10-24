import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Battery {
  factory: Timer;
  shells: Timer;
}

// Every 40 seconds a Pocket Factory (A01D: n000 for 40 s) on walkable ground
// 400 from the hero,
// sending out a Spotter Goblin (n01U: 125 life, 12 s, 60 when it dies) every
// 2.5 seconds that runs at the nearest enemy ground unit. Every 1.25 seconds a shell at the spotter within 1000 of the
// hero with the most enemies within 250 of it: where it lands it does 100 to
// every enemy within 250 and blows the spotter up
export class DangerClose extends WeaponUpgradeRecipe {
  public readonly cooldown = 40;
  public readonly itemTypeId = FourCC("I01H");
  public readonly merchantItemTypeId = FourCC("I01G");
  public readonly recipe: number[] = [FourCC("I000"), FourCC("I00O")];

  private readonly batteries = new Map<number, Battery>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly factoryAbilityId: number = FourCC("A01D");
  private readonly spotterUnitId: number = FourCC("n01U");
  // Spotters a shell is already on its way to
  private readonly marked = new Set<Unit>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const build = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.factoryAbilityId);
      // Somewhere the spotters can walk out of
      const start = RandomNumberGenerator.random(0, 359);
      let x = hero.x;
      let y = hero.y;
      for (let i = 0; i < 12; i++) {
        const radians = (start + 30 * i) * MULT;
        x = hero.x + 400 * Math.cos(radians);
        y = hero.y + 400 * Math.sin(radians);
        if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) break;
      }
      dummy.issueOrderAt("summonfactory", x, y);
    };
    build();
    const factory = TimerUtils.newTimer();
    factory.start(this.cooldown, true, build);

    const shells = TimerUtils.newTimer();
    shells.start(1.25, true, () => {
      const hero = vehicle.unit;
      let spotter: Unit | undefined;
      let most = 0;
      const grp = Group.fromRange(1000, hero.point);
      grp.for((u) => {
        if (u.typeId !== this.spotterUnitId) return;
        if (GetOwningPlayer(u.handle) !== owner.handle) return;
        if (!u.isAlive()) return;
        if (this.marked.has(u)) return;

        const around = this.enemiesAround(owner, u.x, u.y);
        // Spotters with nobody around them run into the nearest enemies
        if (around === 0) this.runIn(owner, u);
        if (around > most) {
          spotter = u;
          most = around;
        }
      });
      grp.destroy();
      if (spotter == null) return;
      this.shell(hero, owner, spotter);
    });

    this.batteries.set(itemId, { factory, shells });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const battery = this.batteries.get(itemId);
    this.batteries.delete(itemId);
    if (battery == null) return;
    TimerUtils.releaseTimer(battery.factory);
    TimerUtils.releaseTimer(battery.shells);
  }

  private enemiesAround(owner: MapPlayer, x: number, y: number): number {
    let n = 0;
    const at = Point.create(x, y);
    const grp = Group.fromRange(250, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      n++;
    });
    grp.destroy();
    at.destroy();
    return n;
  }

  private runIn(owner: MapPlayer, spotter: Unit) {
    let target: Unit | undefined;
    let nearest = 0;
    const grp = Group.fromRange(900, spotter.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      const dx = u.x - spotter.x;
      const dy = u.y - spotter.y;
      if (target == null || dx * dx + dy * dy < nearest) {
        target = u;
        nearest = dx * dx + dy * dy;
      }
    });
    grp.destroy();
    if (target == null) return;
    spotter.issueTargetOrder("attack", target);
  }

  // An arcing shell from the hero to where the spotter stands now
  private shell(hero: Unit, owner: MapPlayer, spotter: Unit) {
    this.marked.add(spotter);
    const flare = Effect.createAttachment(
      "Abilities/Spells/Human/Flare/FlareTarget.mdl",
      spotter,
      "overhead",
    );
    const sx = hero.x;
    const sy = hero.y;
    const tx = spotter.x;
    const ty = spotter.y;
    const dist = Math.sqrt((tx - sx) * (tx - sx) + (ty - sy) * (ty - sy));
    // 1000 a second, at least 0.3 s
    const steps = Math.max(6, Math.ceil(dist / 50));
    const missile = Effect.create(
      "Abilities/Weapons/Mortar/MortarMissile.mdl",
      sx,
      sy,
    );
    missile.setYaw(Atan2(ty - sy, tx - sx));
    let step = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      const f = step / steps;
      missile.x = sx + (tx - sx) * f;
      missile.y = sy + (ty - sy) * f;
      missile.z = 100 + 4 * Math.max(300, dist * 0.4) * f * (1 - f);
      if (step < steps) return;

      TimerUtils.releaseTimer(t);
      missile.destroy();
      flare.destroy();
      this.marked.delete(spotter);
      Effect.create(
        "Abilities/Weapons/Mortar/MortarMissile.mdl",
        tx,
        ty,
      ).destroy();
      Effect.create(
        "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
        tx,
        ty,
      ).destroy();

      const at = Point.create(tx, ty);
      const grp = Group.fromRange(250, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hero.damageTarget(
          u.handle,
          100,
          false,
          false,
          ATTACK_TYPE_SIEGE,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
      at.destroy();

      // Wherever it ran to, the spotter goes up with its shell
      if (spotter.isAlive()) spotter.kill();
    });
  }
}
