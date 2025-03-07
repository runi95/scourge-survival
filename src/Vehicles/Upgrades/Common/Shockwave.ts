import { Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../Utility/Globals";

const MULT = Math.PI / 180;

export class Shockwave extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNShockWave.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description =
    "Sends 2 shockwaves in opposite directions every 2.5 seconds|nShockwaves deal 50 damage to any unit it hits";

  private readonly playerTimers: Timer[] = [];

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shockwaveAbilityId: number = FourCC("A00B");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I002"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    this.playerTimers[owner.id] = t;
    t.start(2.5, true, () => {
      const shockwaveLevel = vehicle.upgradeMap.get(this.name);
      const { x, y } = vehicle.unit;

      const randomAngle = RandomNumberGenerator.random(0, 359);
      const radians = [randomAngle * MULT, ((randomAngle + 180) % 360) * MULT];
      for (let i = 0; i < 2; i++) {
        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
        dummy.addAbility(this.shockwaveAbilityId);
        if (shockwaveLevel > 1) {
          dummy.setAbilityLevel(this.shockwaveAbilityId, shockwaveLevel);
        }

        dummy.issueOrderAt(
          "shockwave",
          x + 400 * Math.cos(radians[i]),
          y + 400 * Math.sin(radians[i])
        );
      }
    });
  }
}
