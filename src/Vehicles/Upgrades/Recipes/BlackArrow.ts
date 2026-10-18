import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { BlackArrowDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BlackArrowDamageEvent";

// The Dark Ranger's Black Arrow: an enemy that dies within 5 seconds of being
// hit by one (BlackArrowDamageEvent marks it) rises as a Dark Minion
export class BlackArrow extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I0AG");
  public readonly merchantItemTypeId = FourCC("I0AH");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I05K")];

  private readonly timers = new Map<number, Timer>();
  private readonly arrowUnitTypeId: number = FourCC("u02A");
  private readonly minionUnitTypeId: number = FourCC("u02B");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      const owner = BlackArrowDamageEvent.MARKED.get(dying.id);
      if (owner == null) return;
      BlackArrowDamageEvent.MARKED.delete(dying.id);
      if (dying.isUnitType(UNIT_TYPE_FLYING)) return;
      if (dying.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const { x, y } = dying;
      Effect.create(
        "Abilities/Spells/Undead/AnimateDead/AnimateDeadTarget.mdl",
        x,
        y,
      ).destroy();
      const minion = Unit.create(
        owner,
        this.minionUnitTypeId,
        x,
        y,
        dying.facing,
      );
      minion.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
      minion.setAnimation("birth");
      minion.queueAnimation("stand");
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
      // The weakest enemy in range, to finish it off
      let target: Unit | undefined;
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        if (target != null && u.life >= target.life) return;
        target = u;
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (target == null) return;

      const { x, y } = vehicle.unit;
      const arrow = Unit.create(owner, this.arrowUnitTypeId, x, y);
      arrow.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      arrow.issueTargetOrder("attack", target);
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
