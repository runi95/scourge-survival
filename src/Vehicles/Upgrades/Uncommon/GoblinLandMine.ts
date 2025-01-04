import { Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { Globals } from "../../../Utility/Globals";

export class GoblinLandMine extends VehicleUpgrade {
  public readonly name = "Goblin Land Mine";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNGoblinLandMine.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description =
    "Places a Goblin Land Mine underneath the tank every 3 seconds.";

  private readonly playerTimers: Timer[] = [];

  private readonly landMineUnitTypeId: number = FourCC("n005");
  private readonly explosionAbilityId: number = FourCC("A00D");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I003"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    this.playerTimers[owner.id] = t;
    t.start(3, true, () => {
      const landMineLevel = vehicle.upgradeMap.get(this.name);
      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.landMineUnitTypeId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
      if (landMineLevel > 1) {
        dummy.setAbilityLevel(this.explosionAbilityId, landMineLevel);
      }
    });
  }
}
