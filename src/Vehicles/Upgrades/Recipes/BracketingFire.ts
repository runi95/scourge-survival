import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Spots the enemy nearest the hero with a crippling flare, then walks a
// barrage in on it: 3 volleys of Cluster Rockets, each scattered tighter
// around where it is now (300, 175, then 75 across)
export class BracketingFire extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0AC");
  public readonly merchantItemTypeId = FourCC("I0AD");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");
  // Cluster Rockets with an area of 300, 175 and 75
  private readonly volleyAbilityIds: number[] = [
    FourCC("A01B"),
    FourCC("A051"),
    FourCC("A052"),
  ];

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

      const { x, y } = vehicle.unit;
      let spotted: Unit | undefined;
      let spottedDistance = 0;
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (spotted != null && distance >= spottedDistance) return;
        spotted = u;
        spottedDistance = distance;
      });
      grp.destroy();
      if (spotted == null) return;

      this.bracket(owner, vehicle.unit, spotted);
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

  // A volley every 0.75 seconds, from wherever the hero is then
  private bracket(owner: MapPlayer, hero: Unit, spotted: Unit): void {
    Effect.createAttachment(
      "Abilities/Spells/Human/Flare/FlareTarget.mdl",
      spotted,
      "overhead",
    ).destroy();
    const flare = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    flare.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    flare.addAbility(this.crippleAbilityId);
    flare.issueTargetOrder(OrderId.Cripple, spotted);
    flare.damageTarget(
      spotted.handle,
      100,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );

    let { x, y } = spotted;
    let volley = 0;
    const t = TimerUtils.newTimer();
    t.start(0.75, true, () => {
      if (spotted.isAlive()) {
        x = spotted.x;
        y = spotted.y;
      }
      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.volleyAbilityIds[volley]);
      dummy.issueOrderAt("clusterrockets", x, y);
      volley++;
      if (volley >= this.volleyAbilityIds.length) TimerUtils.releaseTimer(t);
    });
  }
}
