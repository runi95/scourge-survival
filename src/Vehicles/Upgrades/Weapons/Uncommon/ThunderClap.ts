import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { Globals } from "../../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Group } from "../../../../Utility/Group";
import { Race } from "../../../../Game/Race";

export class ThunderClap extends WeaponUpgrade {
  public readonly name = "Thunder Clap";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly race = Race.HUMAN;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNThunderclap.blp";
  public readonly cost = 200;
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I05C");
  public readonly description = (
    level: number,
  ) => `Slams the ground around your hero, hurting and slowing every enemy unit nearby.

Damage: |cffffcc0060|r
Slow: |cffffcc00-50% movement and attack speed for 3s|r
Cooldown: |cffffcc003s|r
Area of effect: |cffffcc00300|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly thunderClapAbilityId: number = FourCC("A03Z");

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

      let found = false;
      const grp = Group.fromRange(300, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        found = true;
      });
      grp.destroy();
      if (!found) return;

      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.thunderClapAbilityId);
      dummy.issueImmediateOrder("thunderclap");
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
