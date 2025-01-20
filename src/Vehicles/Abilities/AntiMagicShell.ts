import { Effect, Timer, Trigger, Unit } from "w3ts";
import { AntiMagicShellDamageEvent } from "../../Utility/DamageEngine/DamageEvents/AntiMagicShellDamageEvent";
import { TimerUtils } from "../../Utility/TimerUtils";

export class AntiMagicShell {
  private readonly antiMagicShellTrig: Trigger;
  private readonly antiMagicShellAbilitId = FourCC("A01N");

  constructor() {
    this.antiMagicShellTrig = Trigger.create();
    this.antiMagicShellTrig.addAction(() => {
      const ability = GetSpellAbilityId();
      if (ability !== this.antiMagicShellAbilitId) return;

      const triggeringUnit = Unit.fromEvent();
      const { owner } = triggeringUnit;
      const ownerId = owner.id;
      AntiMagicShellDamageEvent.UNIT_ID[ownerId] = triggeringUnit.id;

      const effect = Effect.createAttachment(
        "Abilities/Spells/Undead/AntiMagicShell/AntiMagicShell.mdl",
        triggeringUnit,
        "overhead"
      );
      const t: Timer = TimerUtils.newTimer();
      t.start(10, false, () => {
        TimerUtils.releaseTimer(t);
        AntiMagicShellDamageEvent.UNIT_ID[ownerId] = null;
        effect.destroy();
      });
    });

    this.antiMagicShellTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_CAST);
  }
}
