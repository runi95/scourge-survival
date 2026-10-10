import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { Globals } from "../../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { Group } from "../../../../Utility/Group";
import { Race } from "../../../../Game/Race";

export class FanOfKnives extends WeaponUpgrade {
  public readonly name = "Fan of Knives";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly race = Race.NIGHT_ELF;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNFanOfKnives.blp";
  public readonly cost = 350;
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I05R");
  public readonly description = (
    level: number,
  ) => `Flings a fan of knives at every enemy unit around your hero.

Damage: |cffffcc0075|r
Cooldown: |cffffcc003s|r
Area of effect: |cffffcc00400|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly fanOfKnivesAbilityId: number = FourCC("A048");

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
      const grp = Group.fromRange(400, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        found = true;
      });
      grp.destroy();
      if (!found) return;

      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.fanOfKnivesAbilityId);
      dummy.issueImmediateOrder("fanofknives");
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
