import { Effect, MapPlayer, Timer, WeatherEffect } from "w3ts/index";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { GameMap } from "../../../Game/GameMap";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Group } from "../../../Utility/Group";

export class Monsoon extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNMonsoon.blp";
  public readonly cost = 350;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];

  public applyUpgrade(vehicle: Vehicle): void {
    const owner = vehicle.unit.owner;
    const playerId = owner.id;
    const monsoonLevel = vehicle.upgradeMap.get(this.name);
    if (monsoonLevel === 1) {
      vehicle.unit.addItemById(FourCC("I004"));
    } else {
      this.playerTimers[playerId].destroy();
    }

    let timeout = 15;
    switch (monsoonLevel) {
      case 2:
        timeout = 7.5;
        break;
      case 3:
        timeout = 5;
        break;
      case 4:
        timeout = 3.75;
        break;
      case 5:
        timeout = 3;
        break;
    }

    const area = GameMap.PLAYER_AREAS[playerId];
    const lightRain = WeatherEffect.create(area, FourCC("RAlr"));
    lightRain.enable(true);

    const scourgePlayer = MapPlayer.fromIndex(playerId + 9);
    const t: Timer = TimerUtils.newTimer();
    this.playerTimers[playerId] = t;
    t.start(timeout, true, () => {
      const grp: Group = Group.fromRectOfPlayer(area, scourgePlayer);
      let hasStruck = false;

      grp.for((u) => {
        if (hasStruck) return;
        if (!u.isAlive()) return;

        hasStruck = true;
        Effect.create(
          "Abilities/Spells/Other/Monsoon/MonsoonBoltTarget.mdl",
          u.x,
          u.y
        ).destroy();
        const monsoonLevel = vehicle.upgradeMap.get(this.name);
        vehicle.unit.damageTarget(
          u.handle,
          1500,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS
        );
      });
      grp.destroy();
    });
  }
}
