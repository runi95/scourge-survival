import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

// Sends a swarm of bats from a Clinging Swarm Caster at a random enemy;
// ClingingSwarmDamageEvent latches a bat onto every enemy it hits
export class ClingingSwarm extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0BM");
  public readonly merchantItemTypeId = FourCC("I0BN");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly casterUnitTypeId: number = FourCC("u02E");
  private readonly carrionSwarmAbilityId: number = FourCC("A044");

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
      const enemies: Unit[] = [];
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (enemies.length === 0) return;

      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];

      const { x, y } = vehicle.unit;
      const caster = Unit.create(owner, this.casterUnitTypeId, x, y);
      caster.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      caster.addAbility(this.carrionSwarmAbilityId);
      caster.issueOrderAt("carrionswarm", target.x, target.y);
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
