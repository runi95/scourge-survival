import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

const MULT = Math.PI / 180;

interface Rig {
  machine: Unit | undefined;
  elemental: Unit | undefined;
  // Seconds until the next machine
  next: number;
  bubbles: number;
  timer: Timer;
}

// Every 15 seconds a bubble machine (n01X) and a Water Elemental (h002, the
// base weapon's) on walkable ground 300 from the hero, both for 14 s. Every
// 3 seconds the machine blows a bubble that drifts 350 a second after the
// nearest enemy within 700 of it that isn't trapped: it is stunned for 3 s
// and takes 25 a second, then the bubble bursts for 60 to every enemy within
// 200 of it
export class BubbleMachine extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I064");
  public readonly merchantItemTypeId = FourCC("I065");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00M")];

  private readonly rigs = new Map<number, Rig>();
  private readonly machineUnitId: number = FourCC("n01X");
  private readonly elementalUnitId: number = FourCC("h002");
  // Enemies in a bubble, or with one on its way to them
  private readonly trapped = new Set<Unit>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const rig: Rig = {
      machine: undefined,
      elemental: undefined,
      next: 0,
      bubbles: 3,
      timer: TimerUtils.newTimer(),
    };
    this.rigs.set(itemId, rig);

    rig.timer.start(0.5, true, () => {
      const hero = vehicle.unit;
      rig.next -= 0.5;
      if (rig.next <= 0) {
        rig.next = this.cooldown;
        hero.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        this.setUp(rig, owner, hero);
      }

      const machine = rig.machine;
      if (machine == null || !machine.isAlive()) return;
      rig.bubbles -= 0.5;
      if (rig.bubbles > 0) return;
      rig.bubbles = 3;

      let target: Unit | undefined;
      let nearest = 0;
      const grp = Group.fromRange(700, machine.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (this.trapped.has(u)) return;

        const dx = u.x - machine.x;
        const dy = u.y - machine.y;
        if (target == null || dx * dx + dy * dy < nearest) {
          target = u;
          nearest = dx * dx + dy * dy;
        }
      });
      grp.destroy();
      if (target == null) return;
      this.blow(hero, owner, machine.x, machine.y, target);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const rig = this.rigs.get(itemId);
    this.rigs.delete(itemId);
    if (rig == null) return;
    TimerUtils.releaseTimer(rig.timer);
    if (rig.machine != null) rig.machine.kill();
    if (rig.elemental != null) rig.elemental.kill();
  }

  private setUp(rig: Rig, owner: MapPlayer, hero: Unit) {
    const start = RandomNumberGenerator.random(0, 359);
    let x = hero.x;
    let y = hero.y;
    for (let i = 0; i < 12; i++) {
      const radians = (start + 30 * i) * MULT;
      x = hero.x + 300 * Math.cos(radians);
      y = hero.y + 300 * Math.sin(radians);
      if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) break;
    }
    rig.machine = Unit.create(owner, this.machineUnitId, x, y, 270);
    rig.machine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
    rig.elemental = Unit.create(owner, this.elementalUnitId, x + 120, y);
    rig.elemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
    rig.elemental.setAnimation("birth");
    rig.elemental.queueAnimation("stand");
  }

  private blow(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    target: Unit,
  ) {
    this.trapped.add(target);
    const bubble = Effect.create(
      "Abilities/Weapons/WaterElementalMissile/WaterElementalMissile.mdl",
      x,
      y,
    );
    bubble.scale = 2;
    bubble.z = 60;
    let bx = x;
    let by = y;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      if (!target.isAlive()) {
        TimerUtils.releaseTimer(t);
        bubble.destroy();
        this.trapped.delete(target);
        return;
      }
      const dx = target.x - bx;
      const dy = target.y - by;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 30) {
        bx += (17.5 * dx) / d;
        by += (17.5 * dy) / d;
        bubble.x = bx;
        bubble.y = by;
        return;
      }
      TimerUtils.releaseTimer(t);
      bubble.destroy();
      this.trap(hero, owner, target);
    });
  }

  private trap(hero: Unit, owner: MapPlayer, target: Unit) {
    const shell = Effect.createAttachment(
      "Abilities/Spells/Human/ManaShield/ManaShieldCaster.mdl",
      target,
      "origin",
    );
    StunUtils.stunUnit(target.handle, 3);
    let seconds = 0;

    const t = TimerUtils.newTimer();
    t.start(1, true, () => {
      seconds++;
      if (target.isAlive()) {
        hero.damageTarget(
          target.handle,
          25,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
      if (seconds < 3 && target.isAlive()) return;

      TimerUtils.releaseTimer(t);
      shell.destroy();
      this.trapped.delete(target);
      Effect.create(
        "Objects/Spawnmodels/Naga/NagaDeath/NagaDeath.mdl",
        target.x,
        target.y,
      ).destroy();
      const at = Point.create(target.x, target.y);
      const grp = Group.fromRange(200, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hero.damageTarget(
          u.handle,
          60,
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
