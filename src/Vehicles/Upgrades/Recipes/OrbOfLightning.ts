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

export class OrbOfLightning extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I03X");
  public readonly merchantItemTypeId = FourCC("I03Y");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemTraps = new Map<number, Trap[]>();
  private readonly itemElapsed = new Map<number, number>();
  private readonly trapUnitTypeId: number = FourCC("n00V");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private crackleTrigger: Trigger;

  public onInitialize(): void {
    this.crackleTrigger = Trigger.create();
    this.crackleTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.crackleTrigger.addAction(() => {
      const trap = Unit.fromEvent();
      if (trap.typeId !== this.trapUnitTypeId) return;

      this.crackle(trap.owner, trap.x, trap.y);
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

  private crackle(owner: MapPlayer, x: number, y: number): void {
    const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 5);
    const field = Effect.create(
      "Abilities/Spells/Orc/LightningShield/LightningShieldBuff.mdl",
      x,
      y,
    );

    let ticks = 0;
    const t = TimerUtils.newTimer();
    t.start(1, true, () => {
      ticks++;
      this.shock(dummy, owner, x, y);
      if (ticks < 4) return;

      TimerUtils.releaseTimer(t);
      field.destroy();
    });
  }

  private shock(source: Unit, owner: MapPlayer, x: number, y: number): void {
    const loc = Point.create(x, y);
    const grp = Group.fromRange(250, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      Effect.createAttachment(
        "Abilities/Weapons/Bolt/BoltImpact.mdl",
        u,
        "chest",
      ).destroy();
      source.damageTarget(
        u.handle,
        250,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    loc.destroy();
  }
}
