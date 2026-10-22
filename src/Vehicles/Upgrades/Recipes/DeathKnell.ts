import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Shadow bolts at the weakest enemy in range, cursing like Shadow Bolt does.
// When a bolt kills, spikes burst out of the corpse and run on the way the
// bolt was flying; an enemy the spikes kill bursts the same way
export class DeathKnell extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.5;
  public readonly itemTypeId = FourCC("I0BS");
  public readonly merchantItemTypeId = FourCC("I0BT");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly boltUnitTypeId: number = FourCC("u02I");
  private readonly spikesUnitTypeId: number = FourCC("u02J");
  private readonly impaleAbilityId: number = FourCC("A00A");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const killer = GetKillingUnit();
      if (killer == null) return;
      const killerTypeId = GetUnitTypeId(killer);
      if (
        killerTypeId !== this.boltUnitTypeId &&
        killerTypeId !== this.spikesUnitTypeId
      )
        return;

      const corpse = Unit.fromEvent();
      const bolt = Unit.fromHandle(killer);
      const { x, y } = corpse;
      const angle = Math.atan2(y - bolt.y, x - bolt.x);
      // Their own kills burst on too
      const spikes = Unit.create(bolt.owner, this.spikesUnitTypeId, x, y);
      spikes.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      spikes.addAbility(this.impaleAbilityId);
      spikes.issueOrderAt(
        "impale",
        x + 100 * Math.cos(angle),
        y + 100 * Math.sin(angle),
      );
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
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let weakest: Unit | undefined;
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (weakest != null && u.life >= weakest.life) return;

        weakest = u;
      });
      grp.destroy();
      if (weakest == null) return;

      const { x, y } = vehicle.unit;
      // It lives long enough to be the killer when its bolt lands
      const bolt = Unit.create(owner, this.boltUnitTypeId, x, y);
      bolt.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      bolt.issueTargetOrder("attack", weakest);
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
