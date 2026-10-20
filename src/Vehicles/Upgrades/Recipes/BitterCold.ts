import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Exposure {
  seconds: number;
  chilled: number;
}

export class BitterCold extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.5;
  public readonly itemTypeId = FourCC("I0B2");
  public readonly merchantItemTypeId = FourCC("I0B3");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chillAbilityId: number = FourCC("A04W");
  private readonly crippleAbilityId: number = FourCC("A03P");
  private readonly crippleBuffId: number = FourCC("Bcri");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    let exposures = new Map<number, Exposure>();
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      const next = new Map<number, Exposure>();
      const grp = Group.fromRange(350, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const exposure = exposures.get(u.id) ?? { seconds: 0, chilled: -3 };
        exposure.seconds += this.cooldown;
        next.set(u.id, exposure);

        const dps = Math.min(40, 10 * Math.ceil(exposure.seconds));
        const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.damageTarget(
          u.handle,
          dps * this.cooldown,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_COLD,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (exposure.seconds - exposure.chilled >= 2.5) {
          exposure.chilled = exposure.seconds;
          dummy.addAbility(this.chillAbilityId);
          dummy.issueTargetOrder(OrderId.Slow, u);
        }
        if (
          exposure.seconds >= 3 &&
          u.getAbilityLevel(this.crippleBuffId) === 0
        ) {
          Effect.createAttachment(
            "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
            u,
            "origin",
          ).destroy();
          const crippler = Unit.create(owner, this.dummyUnitId, u.x, u.y);
          crippler.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
          crippler.addAbility(this.crippleAbilityId);
          crippler.issueTargetOrder(OrderId.Cripple, u);
        }
      });
      grp.destroy();
      exposures = next;
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
