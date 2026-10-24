import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Beating {
  timers: Timer[];
  // Javelin ticks since the last one at an enemy that wasn't stunned
  idle: number;
}

// Every 4 seconds a stomp (A043: 90 within 300) that stuns every enemy
// ground unit within 300 for 1.5 s (with StunUtils, so the javelins can add
// to it). Every 0.5 seconds a javelin (u02M: 34 - 39) at the nearest stunned
// enemy within 600, or every 2 seconds at the nearest enemy while none is;
// BeatdownDamageEvent doubles a javelin on a stunned enemy and adds 0.5 s to
// its stun
export class Beatdown extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I084");
  public readonly merchantItemTypeId = FourCC("I085");
  public readonly recipe: number[] = [FourCC("I02M"), FourCC("I05H")];

  private readonly beatings = new Map<number, Beating>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly javelinUnitId: number = FourCC("u02M");
  private readonly warStompAbilityId: number = FourCC("A043");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const beating: Beating = { timers: [], idle: 0 };
    this.beatings.set(itemId, beating);

    const stomp = TimerUtils.newTimer();
    stomp.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const stunned: Unit[] = [];
      const grp = Group.fromRange(300, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        stunned.push(u);
      });
      grp.destroy();
      if (stunned.length === 0) return;

      const { x, y } = hero;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.warStompAbilityId);
      dummy.issueImmediateOrder("stomp");
      for (const u of stunned) StunUtils.stunUnit(u.handle, 1.5);
    });

    const javelins = TimerUtils.newTimer();
    javelins.start(0.5, true, () => {
      const hero = vehicle.unit;
      let nearest: Unit | undefined;
      let nearestDist = 0;
      let nearestStunned: Unit | undefined;
      let nearestStunnedDist = 0;
      const grp = Group.fromRange(600, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        const d = dx * dx + dy * dy;
        if (nearest == null || d < nearestDist) {
          nearest = u;
          nearestDist = d;
        }
        if (!StunUtils.isStunned(u.id)) return;
        if (nearestStunned == null || d < nearestStunnedDist) {
          nearestStunned = u;
          nearestStunnedDist = d;
        }
      });
      grp.destroy();

      beating.idle++;
      let target = nearestStunned;
      if (target == null) {
        if (beating.idle < 4) return;
        target = nearest;
      }
      if (target == null) return;
      beating.idle = 0;

      const javelin = Unit.create(owner, this.javelinUnitId, hero.x, hero.y);
      javelin.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      javelin.issueTargetOrder("attack", target);
    });
    beating.timers.push(stomp, javelins);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const beating = this.beatings.get(itemId);
    this.beatings.delete(itemId);
    if (beating == null) return;
    for (const t of beating.timers) TimerUtils.releaseTimer(t);
    beating.timers.length = 0;
  }
}
