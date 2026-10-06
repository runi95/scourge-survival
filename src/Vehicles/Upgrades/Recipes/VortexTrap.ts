import { Effect, Item, MapPlayer, Point, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Victim {
  unit: Unit;
  startRadius: number;
  endRadius: number;
  angle: number;
}

export class VortexTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I01S");
  public readonly merchantItemTypeId = FourCC("I01T");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I00X")];

  private readonly timers = new Map<number, Timer>();
  // Trap handle id -> the timer that removes it when it expires untriggered
  private readonly trapLifetimes = new Map<number, Timer>();
  private readonly vortexTrapUnitTypeId: number = FourCC("n00F");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly crowFormAbilityId: number = FourCC("Amrf");
  private trapDeathTrigger: Trigger;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.registerTrapDeaths();
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.placeTrap(owner, x, y);
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

  // The trap uses the land mine's own Mine ability (A00E): once armed it kills
  // itself when an enemy ground unit comes close. There is no death damage
  // ability on it; its death sets off the vortex instead.
  private registerTrapDeaths(): void {
    if (this.trapDeathTrigger != null) return;

    this.trapDeathTrigger = Trigger.create();
    this.trapDeathTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.trapDeathTrigger.addAction(() => {
      const trap = Unit.fromEvent();
      if (trap.typeId !== this.vortexTrapUnitTypeId) return;

      const lifetime = this.trapLifetimes.get(trap.id);
      this.trapLifetimes.delete(trap.id);
      if (lifetime != null) TimerUtils.releaseTimer(lifetime);

      const { owner, x, y } = trap;
      trap.destroy();
      this.triggerTrap(owner, x, y);
    });
  }

  private placeTrap(owner: MapPlayer, x: number, y: number): void {
    const trap = Unit.create(owner, this.vortexTrapUnitTypeId, x, y);
    const trapId = trap.id;
    const t = TimerUtils.newTimer();
    this.trapLifetimes.set(trapId, t);
    t.start(180, false, () => {
      this.trapLifetimes.delete(trapId);
      TimerUtils.releaseTimer(t);
      trap.destroy();
    });
  }

  private triggerTrap(owner: MapPlayer, x: number, y: number): void {
    const vortex = Effect.create("war3mapImported/VortexTrap.mdx", x, y);
    vortex.playAnimation(ANIM_TYPE_BIRTH);
    let opened = false;

    const victims = this.getEnemies(owner, x, y, 400).map((u) =>
      this.catchVictim(u, x, y),
    );

    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      if (!opened && elapsed >= 0.3) {
        opened = true;
        vortex.playAnimation(ANIM_TYPE_STAND);
      }

      const progress = Math.min(1, elapsed / 1.2);
      for (const victim of victims) {
        this.pullVictim(victim, x, y, progress);
      }

      if (progress < 1) return;

      TimerUtils.releaseTimer(t);
      for (const victim of victims) {
        this.releaseVictim(victim);
      }
      vortex.destroy();
      this.detonate(owner, x, y);
    });
  }

  private catchVictim(u: Unit, x: number, y: number): Victim {
    const startRadius = Math.sqrt((u.x - x) ** 2 + (u.y - y) ** 2);
    StunUtils.stunUnit(u.handle, 1.2);
    if (u.addAbility(this.crowFormAbilityId)) {
      u.removeAbility(this.crowFormAbilityId);
    }

    return {
      unit: u,
      startRadius,
      endRadius: Math.min(startRadius, 25 + 35 * (startRadius / 400)),
      angle: Math.atan2(u.y - y, u.x - x),
    };
  }

  // Spirals the victim in: slow at first, then faster and faster (ease in),
  // whirling around quicker the closer it gets, lifted off the ground on the
  // way and dropped back down as the trap detonates
  private pullVictim(
    victim: Victim,
    x: number,
    y: number,
    progress: number,
  ): void {
    const { unit } = victim;
    if (!unit.isAlive()) return;

    const eased = progress * progress;
    const radius =
      victim.endRadius + (victim.startRadius - victim.endRadius) * (1 - eased);
    victim.angle += (-480 * 0.03125) / Math.max(radius, 80);

    const newX = x + radius * Math.cos(victim.angle);
    const newY = y + radius * Math.sin(victim.angle);
    const facing = Math.atan2(newY - unit.y, newX - unit.x);
    unit.x = newX;
    unit.y = newY;
    BlzSetUnitFacingEx(unit.handle, facing * bj_RADTODEG);
    unit.setflyHeight(60 * Math.sin(Math.PI * progress), 0);
  }

  private releaseVictim(victim: Victim): void {
    victim.unit.setflyHeight(victim.unit.defaultFlyHeight, 0);
  }

  private detonate(owner: MapPlayer, x: number, y: number): void {
    Effect.create(
      "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
      x,
      y,
    ).destroy();

    const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    for (const u of this.getEnemies(owner, x, y, 250)) {
      dummy.damageTarget(
        u.handle,
        600,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    }
  }

  private getEnemies(
    owner: MapPlayer,
    x: number,
    y: number,
    radius: number,
  ): Unit[] {
    const enemies: Unit[] = [];
    const loc = Point.create(x, y);
    const grp = Group.fromRange(radius, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    loc.destroy();

    return enemies;
  }
}
