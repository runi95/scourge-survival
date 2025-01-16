import { Trigger, Unit } from "w3ts";
import { GameMap } from "../../Game/GameMap";

export class AdeptTraining {
  private readonly adeptTrainingTrig: Trigger;
  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.adeptTrainingTrig = Trigger.create();
    this.adeptTrainingTrig.addAction(() => {
      const triggeringUnit = Unit.fromEvent();
      const { owner } = triggeringUnit;
      const ownerId = owner.id;

      const vehicle = this.gameMap.playerVehicles[ownerId];
      if (vehicle == null) return;

      const learnedSkill = GetLearnedSkill();
      const skillLevel = GetLearnedSkillLevel();
      vehicle.skillMap.set(learnedSkill, skillLevel);

      const adeptTrainingLevel = vehicle.upgradeMap.get("Adept Training");
      if (adeptTrainingLevel == null) return;

      const originalCooldown = BlzGetAbilityCooldown(
        learnedSkill,
        skillLevel - 1
      );
      if (originalCooldown <= 0) return;

      const newAbilityCooldown =
        originalCooldown - originalCooldown * adeptTrainingLevel * 0.1;
      vehicle.unit.setAbilityCooldown(
        learnedSkill,
        skillLevel - 1,
        newAbilityCooldown
      );
    });

    this.adeptTrainingTrig.registerAnyUnitEvent(EVENT_PLAYER_HERO_SKILL);
  }
}
