import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

interface Trap {
  unit: Unit;
  placedAt: number;
}

export class PlagueMine extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I04C");
  public readonly merchantItemTypeId = FourCC("I04D");
  public readonly recipe: number[] = [FourCC("I02K"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemTraps = new Map<number, Trap[]>();
  private readonly itemElapsed = new Map<number, number>();
  private readonly trapUnitTypeId: number = FourCC("n00X");
  private readonly diseaseCloudUnitTypeId: number = FourCC("u019");
  private diseaseTrigger: Trigger;

  public onInitialize(): void {
    this.diseaseTrigger = Trigger.create();
    this.diseaseTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.diseaseTrigger.addAction(() => {
      const trap = Unit.fromEvent();
      if (trap.typeId !== this.trapUnitTypeId) return;

      const cloud = Unit.create(
        trap.owner,
        this.diseaseCloudUnitTypeId,
        trap.x,
        trap.y,
      );
      cloud.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 8);
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
}
