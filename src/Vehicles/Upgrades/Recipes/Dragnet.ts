import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { DragnetDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/DragnetDamageEvent";

const MULT = Math.PI / 180;

interface Net {
  members: Unit[];
}

// Every 2.5 seconds a shockwave (A05I: 80 to air and ground along 1000)
// towards the nearest enemy within 700. Every enemy it hits is ensnared
// (A042: held 3 s, flyers pulled down) into the same net for 5 seconds: 40%
// of the damage one of them takes is dealt to each of the others within 800
// of it, as spirit link damage that is not shared again
export class Dragnet extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I080");
  public readonly merchantItemTypeId = FourCC("I081");
  public readonly recipe: number[] = [FourCC("I002"), FourCC("I05G")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shockwaveAbilityId: number = FourCC("A05I");
  private readonly ensnareAbilityId: number = FourCC("A042");

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
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let nearest: Unit | undefined;
      let nearestDist = 0;
      const grp = Group.fromRange(700, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const d =
          (u.x - hero.x) * (u.x - hero.x) + (u.y - hero.y) * (u.y - hero.y);
        if (nearest == null || d < nearestDist) {
          nearest = u;
          nearestDist = d;
        }
      });
      grp.destroy();
      if (nearest == null) return;

      const net: Net = { members: [] };
      const { x, y } = hero;
      const radians = Atan2(nearest.y - y, nearest.x - x);
      const wave = Unit.create(owner, this.dummyUnitId, x, y);
      wave.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      wave.addAbility(this.shockwaveAbilityId);
      const waveId = wave.id;
      DragnetDamageEvent.WAVES.set(waveId, (struck) =>
        this.catch(hero, owner, net, struck),
      );
      wave.issueOrderAt(
        "shockwave",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );

      const close = TimerUtils.newTimer();
      close.start(4, false, () => {
        TimerUtils.releaseTimer(close);
        DragnetDamageEvent.WAVES.delete(waveId);
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
  }

  // The wave's enemy is held and tied into its net for 5 seconds
  private catch(hero: Unit, owner: MapPlayer, net: Net, struck: Unit) {
    if (!struck.isAlive()) return;
    if (net.members.indexOf(struck) >= 0) return;
    net.members.push(struck);

    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    const dummy = Unit.create(
      owner,
      this.dummyUnitId,
      struck.x + 100 * Math.cos(radians),
      struck.y + 100 * Math.sin(radians),
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    dummy.addAbility(this.ensnareAbilityId);
    dummy.issueTargetOrder("ensnare", struck);

    const id = struck.id;
    const share = (hurt: Unit, damage: number) => {
      for (const other of net.members) {
        if (other === hurt || !other.isAlive()) continue;
        const dx = other.x - hurt.x;
        const dy = other.y - hurt.y;
        if (dx * dx + dy * dy > 800 * 800) continue;
        hero.damageTarget(
          other.handle,
          0.4 * damage,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_SPIRIT_LINK,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
    };
    DragnetDamageEvent.NETTED.set(id, share);

    const untie = TimerUtils.newTimer();
    untie.start(5, false, () => {
      TimerUtils.releaseTimer(untie);
      if (DragnetDamageEvent.NETTED.get(id) === share) {
        DragnetDamageEvent.NETTED.delete(id);
      }
      const i = net.members.indexOf(struck);
      if (i >= 0) net.members.splice(i, 1);
    });
  }
}
