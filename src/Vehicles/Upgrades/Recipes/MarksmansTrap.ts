import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class MarksmansTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I03D");
  public readonly merchantItemTypeId = FourCC("I03E");
  public readonly recipe: number[] = [FourCC("I00Y"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly mineUnitTypeId: number = FourCC("n00T");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A030");

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
      const target = this.farthestEnemy(vehicle.unit, owner);
      if (target == null) return;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = target;
      const distance = Math.sqrt(
        Math.pow(x - vehicle.unit.x, 2) + Math.pow(y - vehicle.unit.y, 2),
      );
      Effect.createAttachment(
        "Abilities/Weapons/Rifle/RifleImpact.mdl",
        target,
        "chest",
      ).destroy();
      vehicle.unit.damageTarget(
        target.handle,
        Math.max(75, (750 * distance) / 1500),
        false,
        true,
        ATTACK_TYPE_PIERCE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );

      if (!target.isAlive()) {
        const mine = Unit.create(owner, this.mineUnitTypeId, x, y);
        mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
        return;
      }

      const dummy = Unit.create(
        owner,
        this.dummyUnitTypeId,
        vehicle.unit.x,
        vehicle.unit.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      dummy.addAbility(this.netAbilityId);
      dummy.issueTargetOrder("ensnare", target);
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

  private farthestEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const { x, y } = source;
    let farthest: Unit | undefined;
    let farthestDistance = -1;
    const grp = Group.fromRange(1500, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const distance = Math.pow(u.x - x, 2) + Math.pow(u.y - y, 2);
      if (distance > farthestDistance) {
        farthest = u;
        farthestDistance = distance;
      }
    });
    grp.destroy();

    return farthest;
  }
}
