import { Item, MapPlayer, Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { Globals } from "../../../Utility/Globals";
import { WeaponUpgrade } from "../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";

export class GoblinLandMine extends WeaponUpgrade {
  public readonly name = "Goblin Land Mine";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNGoblinLandMine.blp";
  public readonly cost = 200;
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I003");
  public readonly description = (
    level: number
  ) => `Places Goblin Land Mines underneath your hero.

Damage: |cffffcc00150|r
Cooldown: |cffffcc003s|r
Targets: |cffffcc00ground only!|r
Damage type: |cffffcc00spell|r
Mine activation delay: |cffffcc004s|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly landMineUnitTypeId: number = FourCC("n005");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(3, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );
      const dummy = Unit.create(owner, this.landMineUnitTypeId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
