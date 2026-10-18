import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

// Shadow bolts pile their curses onto one enemy; every 5 seconds a cripple
// tears the curses out of it, dealing damage for each one
export class SoulRend extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0AA");
  public readonly merchantItemTypeId = FourCC("I0AB");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I04O")];

  private readonly boltTimers = new Map<number, Timer>();
  private readonly rendTimers = new Map<number, Timer>();
  private readonly victims = new Map<number, Unit>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shadowBoltUnitTypeId: number = FourCC("u01Q");
  private readonly crippleAbilityId: number = FourCC("A03P");
  // The Shadow Bolt curse: its level is how many curses an enemy carries
  private readonly curseAbilityId: number = FourCC("A016");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const bolts: Timer = TimerUtils.newTimer();
    this.boltTimers.set(itemId, bolts);
    bolts.start(0.75, true, () => {
      const victim = this.victim(vehicle.unit, owner, itemId);
      if (victim == null) return;

      const { x, y } = vehicle.unit;
      const bolt = Unit.create(owner, this.shadowBoltUnitTypeId, x, y);
      bolt.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      bolt.issueTargetOrder("attack", victim);
    });

    const rend: Timer = TimerUtils.newTimer();
    this.rendTimers.set(itemId, rend);
    rend.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const victim = this.victims.get(itemId);
      if (victim == null || !victim.isAlive()) return;
      const curses = victim.getAbilityLevel(this.curseAbilityId);
      if (curses === 0) return;

      // Torn free, it is somebody else's turn
      this.victims.delete(itemId);
      victim.removeAbility(this.curseAbilityId);
      Effect.createAttachment(
        "Abilities/Spells/Undead/DeathPact/DeathPactTarget.mdl",
        victim,
        "origin",
      ).destroy();
      const dummy = Unit.create(owner, this.dummyUnitId, victim.x, victim.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, victim);
      dummy.damageTarget(
        victim.handle,
        75 * curses,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    TimerUtils.releaseTimer(this.boltTimers.get(itemId));
    this.boltTimers.delete(itemId);
    TimerUtils.releaseTimer(this.rendTimers.get(itemId));
    this.rendTimers.delete(itemId);
    this.victims.delete(itemId);
  }

  // The bolts stay on one enemy while it lives and is in range
  private victim(hero: Unit, owner: MapPlayer, itemId: number): Unit {
    const current = this.victims.get(itemId);
    const enemies: Unit[] = [];
    let keep = false;
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      if (u.handle === current?.handle) keep = true;
      enemies.push(u);
    });
    grp.destroy();
    if (keep) return current;
    if (enemies.length === 0) return undefined;

    const victim = enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
    this.victims.set(itemId, victim);
    return victim;
  }
}
