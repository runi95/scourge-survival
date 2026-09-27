import { Effect, TextTag, Trigger, Unit } from "w3ts";
import { BansheeShellDamageEvent } from "../../Utility/DamageEngine/DamageEvents/BansheeShellDamageEvent";
import { TimerUtils } from "../../Utility/TimerUtils";

export class BansheeShell {
  private readonly shellAbilityId = FourCC("A02M");
  private readonly absorb = [150, 250, 350, 450, 550];
  private readonly duration = 12;

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.shellAbilityId) return;

      const caster = Unit.fromEvent();
      const playerId = caster.owner.id;
      BansheeShellDamageEvent.REMAINING[playerId] =
        this.absorb[caster.getAbilityLevel(this.shellAbilityId) - 1];
      const shell = Effect.createAttachment(
        "Abilities/Spells/Undead/AntiMagicShell/AntiMagicShell.mdl",
        caster,
        "overhead",
      );

      let elapsed = 0;
      const t = TimerUtils.newTimer();
      t.start(0.1, true, () => {
        elapsed += 0.1;
        const broken = BansheeShellDamageEvent.REMAINING[playerId] <= 0;
        if (!broken && elapsed < this.duration && caster.isAlive()) return;

        TimerUtils.releaseTimer(t);
        BansheeShellDamageEvent.REMAINING[playerId] = 0;
        shell.destroy();
        if (broken && caster.isAlive()) this.showBreak(caster);
      });
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }

  private showBreak(banshee: Unit): void {
    Effect.createAttachment(
      "Abilities/Spells/Items/SpellShieldAmulet/SpellShieldCaster.mdl",
      banshee,
      "origin",
    ).destroy();

    const text = TextTag.create();
    text.setText("Shell broken!", 0.023);
    text.setPos(banshee.x, banshee.y, 120);
    text.setColor(170, 120, 255, 255);
    text.setPermanent(false);
    text.setLifespan(2.5);
    text.setFadepoint(1.5);
    text.setVelocity(0, 0.04);
  }
}
