import { Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../Utility/Globals";

export class Impale extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNImpale.blp";
  public readonly cost = 300;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly impaleAbilityId: number = FourCC("A00A");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I001"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    this.playerTimers[owner.id] = t;
    t.start(1.5, true, () => {
      const impaleLevel = vehicle.upgradeMap.get(this.name);
      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.impaleAbilityId);
      if (impaleLevel > 1) {
        dummy.setAbilityLevel(this.impaleAbilityId, impaleLevel);
      }

      dummy.issueOrderAt(
        "impale",
        x + RandomNumberGenerator.random(-100, 100),
        y + RandomNumberGenerator.random(-100, 100)
      );
    });
  }
}
