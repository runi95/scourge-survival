import { Armor } from "./Armor";
import { AttackSpeed } from "./AttackSpeed";
import { CreepUpgrade } from "./CreepUpgrade";
import { Damage } from "./Damage";
import { Health } from "./Health";
import { HitPointRegeneration } from "./HitPointRegeneration";

export class CreepUpgrades {
  public readonly creepUpgradeTypes: CreepUpgrade[] = [
    new Armor(),
    new Damage(),
    new Health(),
    new AttackSpeed(),
    new HitPointRegeneration(),
  ];
}
