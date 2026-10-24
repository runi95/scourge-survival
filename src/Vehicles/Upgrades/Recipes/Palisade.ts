import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Ring {
  x: number;
  y: number;
  damage: number;
  // Seconds it still stands
  left: number;
  spikes: Effect[];
  impaled: Unit[];
}

interface Fort {
  ring?: Ring;
  // How tall the last ring was (1 - 3), and where the hero stomped it
  height: number;
  lastX: number;
  lastY: number;
  timers: Timer[];
}

// Every 4 seconds, with an enemy ground unit within 420, a stomp (A043: 90
// within 300, 1.5 s stun) and a ring 150 - 420 around the hero that stands
// for 4 s: every enemy ground unit inside it is impaled once (50, 75 or 100
// by its height) and slowed (A05K: -50% for 1.5 s). A ring stomped where the
// last one was is one taller, up to 3
export class Palisade extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I094");
  public readonly merchantItemTypeId = FourCC("I095");
  public readonly recipe: number[] = [FourCC("I05H"), FourCC("I02L")];

  private readonly forts = new Map<number, Fort>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly warStompAbilityId: number = FourCC("A043");
  private readonly slowAbilityId: number = FourCC("A05K");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const fort: Fort = {
      height: 0,
      lastX: vehicle.unit.x,
      lastY: vehicle.unit.y,
      timers: [],
    };
    this.forts.set(itemId, fort);

    const stomp = TimerUtils.newTimer();
    stomp.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const { x, y } = hero;
      if (this.enemies(x, y, 420, owner).length === 0) return;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.warStompAbilityId);
      dummy.issueImmediateOrder("stomp");

      const stayed = x === fort.lastX && y === fort.lastY;
      fort.height = stayed ? Math.min(3, fort.height + 1) : 1;
      fort.lastX = x;
      fort.lastY = y;
      this.raise(fort, x, y, 25 + 25 * fort.height);
    });

    const impale = TimerUtils.newTimer();
    impale.start(0.25, true, () => {
      const ring = fort.ring;
      if (ring == null) return;
      ring.left -= 0.25;
      if (ring.left <= 0) {
        this.lower(fort);
        return;
      }
      const hero = vehicle.unit;
      for (const u of this.enemies(ring.x, ring.y, 420, owner)) {
        if (ring.impaled.indexOf(u) >= 0) continue;
        const dx = u.x - ring.x;
        const dy = u.y - ring.y;
        if (dx * dx + dy * dy < 150 * 150) continue;
        ring.impaled.push(u);
        Effect.createAttachment(
          "Abilities/Spells/Undead/Impale/ImpaleHitTarget.mdl",
          u,
          "origin",
        ).destroy();
        hero.damageTarget(
          u.handle,
          ring.damage,
          false,
          false,
          ATTACK_TYPE_PIERCE,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (!u.isAlive()) continue;
        const slower = Unit.create(owner, this.dummyUnitId, u.x, u.y);
        slower.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        slower.addAbility(this.slowAbilityId);
        slower.issueTargetOrder("slow", u);
      }
    });
    fort.timers.push(stomp, impale);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const fort = this.forts.get(itemId);
    this.forts.delete(itemId);
    if (fort == null) return;
    for (const t of fort.timers) TimerUtils.releaseTimer(t);
    fort.timers.length = 0;
    this.lower(fort);
  }

  // A new ring of spears replaces the last one
  private raise(fort: Fort, x: number, y: number, damage: number) {
    this.lower(fort);
    const spikes: Effect[] = [];
    for (let i = 0; i < 16; i++) {
      const radians = i * 22.5 * MULT;
      const spike = Effect.create(
        "Abilities/Spells/Orc/SpikeBarrier/SpikeBarrier.mdl",
        x + 285 * Math.cos(radians),
        y + 285 * Math.sin(radians),
      );
      spike.scale = 0.6 + 0.2 * fort.height;
      spikes.push(spike);
    }
    fort.ring = { x, y, damage, left: 4, spikes, impaled: [] };
  }

  private lower(fort: Fort) {
    if (fort.ring == null) return;
    for (const spike of fort.ring.spikes) spike.destroy();
    fort.ring = undefined;
  }

  // The enemy ground units within range of (x, y)
  private enemies(x: number, y: number, range: number, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
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
}
