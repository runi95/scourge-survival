import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

const MULT = Math.PI / 180;

export class ShockMines extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I024");
  public readonly merchantItemTypeId = FourCC("I025");
  public readonly recipe: number[] = [FourCC("I002"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private shockMinesTrigger: Trigger;
  private readonly shockMineUnitTypeId: number = FourCC("n00I");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly shockwaveAbilityId: number = FourCC("A00B");

  public onInitialize(): void {
    this.shockMinesTrigger = Trigger.create();
    this.shockMinesTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    this.shockMinesTrigger.addAction(() => {
      const mine = Unit.fromEvent();
      if (mine.typeId !== this.shockMineUnitTypeId) return;

      const { owner, x, y, facing } = mine;
      for (let i = 0; i < 4; i++) {
        const radians = (facing + i * 90) * MULT;
        const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
        dummy.addAbility(this.shockwaveAbilityId);
        dummy.issueOrderAt(
          "shockwave",
          x + 400 * Math.cos(radians),
          y + 400 * Math.sin(radians),
        );
      }
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const mine = Unit.create(
        owner,
        this.shockMineUnitTypeId,
        x,
        y,
        vehicle.unit.facing,
      );
      mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 120);
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
}
