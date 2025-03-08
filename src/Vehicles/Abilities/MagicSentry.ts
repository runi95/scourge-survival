import { Trigger, Unit } from "w3ts/index";
import { GameMap } from "../../Game/GameMap";

export class MagicSentry {
  private readonly magicSentryTrig: Trigger;

  constructor() {
    this.magicSentryTrig = Trigger.create();
    this.magicSentryTrig.addAction(() => {
      const trig = Unit.fromEvent();
      const ownerId = trig.owner.id;
      if (ownerId > 8) return;

      const vehicle = GameMap.PLAYER_VEHICLES[ownerId];
      if (vehicle.unit == null) return;

      const magicSentryLevel = vehicle.upgradeMap.get("Magic Sentry");
      if (magicSentryLevel == null) return;
      if (magicSentryLevel < 1) return;

      const abilityId = GetSpellAbilityId();
      const manaCost = BlzGetAbilityManaCost(
        abilityId,
        GetUnitAbilityLevel(trig.handle, abilityId)
      );
      if (manaCost < 1) return;

      vehicle.unit.life = vehicle.unit.life + 0.5 * manaCost;
    });
    this.magicSentryTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }
}
