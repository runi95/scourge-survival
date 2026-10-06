import { Effect, Item, MapPlayer, Point, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Trap {
  unit: Unit;
  placedAt: number;
}

export class FireTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I039");
  public readonly merchantItemTypeId = FourCC("I03A");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemTraps = new Map<number, Trap[]>();
  private readonly itemElapsed = new Map<number, number>();
  private readonly trapUnitTypeId: number = FourCC("n00S");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private eruptionTrigger: Trigger;

  public onInitialize(): void {
    this.eruptionTrigger = Trigger.create();
    this.eruptionTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.eruptionTrigger.addAction(() => {
      const trap = Unit.fromEvent();
      if (trap.typeId !== this.trapUnitTypeId) return;

      this.erupt(trap.owner, trap.x, trap.y);
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const traps = this.itemTraps.get(itemId) ?? [];
    this.itemTraps.set(itemId, traps);
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const elapsed = (this.itemElapsed.get(itemId) ?? 0) + this.cooldown;
      this.itemElapsed.set(itemId, elapsed);

      while (traps.length > 0 && elapsed - traps[0].placedAt >= 180) {
        const old = traps.shift();
        if (old.unit.isAlive()) old.unit.destroy();
      }

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const { x, y } = vehicle.unit;
      traps.push({
        unit: Unit.create(owner, this.trapUnitTypeId, x, y),
        placedAt: elapsed,
      });
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

    const traps = this.itemTraps.get(itemId);
    this.itemTraps.delete(itemId);
    this.itemElapsed.delete(itemId);
    if (traps == null) return;

    for (const trap of traps) {
      if (trap.unit.isAlive()) trap.unit.destroy();
    }
  }

  private erupt(owner: MapPlayer, x: number, y: number): void {
    const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 5);
    const pillar = Effect.create(
      "Abilities/Spells/Human/FlameStrike/FlameStrike1.mdl",
      x,
      y,
    );

    let ticks = 0;
    const t = TimerUtils.newTimer();
    t.start(1, true, () => {
      ticks++;
      this.burn(dummy, owner, x, y);
      if (ticks < 4) return;

      TimerUtils.releaseTimer(t);
      pillar.destroy();
    });
  }

  private burn(source: Unit, owner: MapPlayer, x: number, y: number): void {
    const loc = Point.create(x, y);
    const grp = Group.fromRange(200, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      source.damageTarget(
        u.handle,
        35,
        false,
        false,
        ATTACK_TYPE_MAGIC,
        DAMAGE_TYPE_FIRE,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    loc.destroy();
  }
}
