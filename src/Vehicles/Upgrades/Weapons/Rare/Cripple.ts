import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { Globals } from "../../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { Group } from "../../../../Utility/Group";
import { Race } from "../../../../Game/Race";

export class Cripple extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly race = Race.UNDEAD;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNCripple.blp";
  public readonly cost = 300;
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I04O");
  public readonly description = (
    level: number,
  ) => `Cripples a nearby enemy unit.

Damage: |cffffcc00150|r
Cooldown: |cffffcc002s|r
Range: |cffffcc00600|r
Duration: |cffffcc003s|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");
  private readonly crippleBuffId: number = FourCC("Bcri");

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
      // Enemies that are not crippled yet go first
      const fresh: Unit[] = [];
      const crippled: Unit[] = [];
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        if (u.getAbilityLevel(this.crippleBuffId) > 0) crippled.push(u);
        else fresh.push(u);
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies = fresh.length > 0 ? fresh : crippled;
      if (enemies.length === 0) return;

      const { x, y } = vehicle.unit;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, target);
      dummy.damageTarget(
        target.handle,
        150,
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
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
