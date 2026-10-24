import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";
import { DischargeDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/DischargeDamageEvent";

interface Charge {
  count: number;
  // Seconds left until it fades
  left: number;
  effect: Effect;
}

interface Storm {
  charges: Map<Unit, Charge>;
  timers: Timer[];
}

// Every 2 seconds a chain lightning (A000: 125, -15% a jump) at the nearest
// enemy within 500; every enemy it hits gains a charge, up to 5, for 8 s
// after its last. Every 4 seconds, with an enemy ground unit within 300, a
// stomp: every enemy ground unit within 300 takes 70 + 50 per charge and is
// stunned for 1 s + 0.3 s per charge, and loses its charges
export class Discharge extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I08Q");
  public readonly merchantItemTypeId = FourCC("I08R");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I05H")];

  private readonly storms = new Map<number, Storm>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chainLightningAbilityId: number = FourCC("A000");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const storm: Storm = { charges: new Map(), timers: [] };
    this.storms.set(itemId, storm);

    const lightning = TimerUtils.newTimer();
    lightning.start(2, true, () => {
      const hero = vehicle.unit;
      const target = this.nearest(hero, owner, 500, false);
      if (target == null) return;
      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.chainLightningAbilityId);
      const id = dummy.id;
      DischargeDamageEvent.CASTERS.set(id, (struck) =>
        this.charge(storm, struck),
      );
      dummy.issueTargetOrder("chainlightning", target);

      const forget = TimerUtils.newTimer();
      forget.start(4, false, () => {
        TimerUtils.releaseTimer(forget);
        DischargeDamageEvent.CASTERS.delete(id);
      });
    });

    const fade = TimerUtils.newTimer();
    fade.start(0.5, true, () => {
      const faded: Unit[] = [];
      storm.charges.forEach((charge, u) => {
        charge.left -= 0.5;
        if (charge.left <= 0 || !u.isAlive()) faded.push(u);
      });
      for (const u of faded) this.clear(storm, u);
    });

    const stomp = TimerUtils.newTimer();
    stomp.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (this.nearest(hero, owner, 300, true) == null) return;

      Effect.create(
        "Abilities/Spells/Orc/WarStomp/WarStompCaster.mdl",
        hero.x,
        hero.y,
      ).destroy();
      const stomped: Unit[] = [];
      const grp = Group.fromRange(300, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        stomped.push(u);
      });
      grp.destroy();

      for (const u of stomped) {
        const charge = storm.charges.get(u);
        const count = charge != null ? charge.count : 0;
        if (count > 0) {
          Effect.createAttachment(
            "Abilities/Weapons/Bolt/BoltImpact.mdl",
            u,
            "origin",
          ).destroy();
        }
        this.clear(storm, u);
        hero.damageTarget(
          u.handle,
          70 + 50 * count,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (u.isAlive()) StunUtils.stunUnit(u.handle, 1 + 0.3 * count);
      }
    });
    storm.timers.push(lightning, fade, stomp);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const storm = this.storms.get(itemId);
    this.storms.delete(itemId);
    if (storm == null) return;
    for (const t of storm.timers) TimerUtils.releaseTimer(t);
    storm.timers.length = 0;
    const charged: Unit[] = [];
    storm.charges.forEach((_charge, u) => charged.push(u));
    for (const u of charged) this.clear(storm, u);
  }

  private charge(storm: Storm, u: Unit) {
    if (!u.isAlive()) return;
    const charge = storm.charges.get(u);
    if (charge == null) {
      storm.charges.set(u, {
        count: 1,
        left: 8,
        effect: Effect.createAttachment(
          "Abilities/Spells/Orc/LightningShield/LightningShieldBuff.mdl",
          u,
          "origin",
        ),
      });
      return;
    }
    charge.count = Math.min(5, charge.count + 1);
    charge.left = 8;
  }

  private clear(storm: Storm, u: Unit) {
    const charge = storm.charges.get(u);
    if (charge == null) return;
    charge.effect.destroy();
    storm.charges.delete(u);
  }

  // The visible enemy nearest to the hero within range, only on the ground
  // or not
  private nearest(
    hero: Unit,
    owner: MapPlayer,
    range: number,
    ground: boolean,
  ): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDist = 0;
    const grp = Group.fromRange(range, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (ground && u.isUnitType(UNIT_TYPE_FLYING)) return;

      const d =
        (u.x - hero.x) * (u.x - hero.x) + (u.y - hero.y) * (u.y - hero.y);
      if (nearest == null || d < nearestDist) {
        nearest = u;
        nearestDist = d;
      }
    });
    grp.destroy();
    return nearest;
  }
}
