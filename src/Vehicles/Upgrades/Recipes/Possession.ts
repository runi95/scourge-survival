import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Possesses the enemy with the most life for 4 seconds: it stands helpless
// while shadow bolts lash out of it at the enemies around it (at itself when
// none are left). When the spirit leaves, it tears at the husk
export class Possession extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0AA");
  public readonly merchantItemTypeId = FourCC("I0AB");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I04O")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shadowBoltUnitTypeId: number = FourCC("u01Q");

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

      let host: Unit | undefined;
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (host != null && u.life <= host.life) return;

        host = u;
      });
      grp.destroy();
      if (host == null) return;

      Effect.create(
        "Abilities/Spells/Undead/Possession/PossessionCaster.mdl",
        vehicle.unit.x,
        vehicle.unit.y,
      ).destroy();
      this.possess(owner, host);
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

  // A bolt every 0.5 seconds
  private possess(owner: MapPlayer, host: Unit): void {
    StunUtils.stunUnit(host.handle, 4);
    const spirit = Effect.createAttachment(
      "Abilities/Spells/Undead/Possession/PossessionTarget.mdl",
      host,
      "overhead",
    );
    const at = Point.create(host.x, host.y);
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.5, true, () => {
      elapsed += 0.5;
      if (!host.isAlive() || elapsed > 4) {
        TimerUtils.releaseTimer(t);
        at.destroy();
        spirit.destroy();
        if (!host.isAlive()) return;

        const dummy = Unit.create(owner, this.dummyUnitId, host.x, host.y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.damageTarget(
          host.handle,
          100,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        return;
      }

      at.setPosition(host.x, host.y);
      const pack: Unit[] = [];
      const grp = Group.fromRange(500, at);
      grp.for((u) => {
        if (u === host) return;
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        pack.push(u);
      });
      grp.destroy();
      const target =
        pack.length > 0
          ? pack[RandomNumberGenerator.random(0, pack.length - 1)]
          : host;
      const bolt = Unit.create(
        owner,
        this.shadowBoltUnitTypeId,
        host.x,
        host.y,
      );
      bolt.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      bolt.issueTargetOrder("attack", target);
    });
  }
}
