import { Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../Utility/TimerUtils";
import { Group } from "../../Utility/Group";

interface ActiveMoonlight {
  moonlight: Unit;
  timer: Timer;
  manaCost: number;
  icon: string;
}

export class WrathOfElune {
  private readonly wrathOfEluneAbilityId = FourCC("A00S");
  private readonly moonlightUnitTypeId = FourCC("u01I");
  private readonly moonlightShiftAbilityId = FourCC("A03N");
  private readonly shifting = new Set<Unit>();
  private readonly active = new Map<Unit, ActiveMoonlight>();

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.wrathOfEluneAbilityId) return;

      const caster = Unit.fromEvent();
      if (this.active.has(caster)) {
        this.deactivate(caster);
        return;
      }

      this.activate(caster, GetSpellTargetX(), GetSpellTargetY());
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);

    // A newly learned level starts with its own target type, mana cost and
    // icon, so an active Wrath of Elune has to be switched over to it
    const learnTrig = Trigger.create();
    learnTrig.addAction(() => {
      if (GetLearnedSkill() !== this.wrathOfEluneAbilityId) return;

      const caster = Unit.fromEvent();
      const active = this.active.get(caster);
      if (active == null) return;

      const level = GetLearnedSkillLevel();
      active.manaCost = BlzGetUnitAbilityManaCost(
        caster.handle,
        this.wrathOfEluneAbilityId,
        level - 1,
      );
      active.icon = BlzGetAbilityStringLevelField(
        caster.getAbility(this.wrathOfEluneAbilityId),
        ABILITY_SLF_ICON_NORMAL,
        level - 1,
      );
      this.setToggle(caster, true);
    });
    learnTrig.registerAnyUnitEvent(EVENT_PLAYER_HERO_SKILL);

    const deathTrig = Trigger.create();
    deathTrig.addAction(() => this.deactivate(Unit.fromEvent()));
    deathTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);

    const shiftTrig = Trigger.create();
    shiftTrig.addAction(() => {
      if (GetSpellAbilityId() !== this.moonlightShiftAbilityId) return;

      this.shift(Unit.fromEvent(), GetSpellTargetX(), GetSpellTargetY());
    });
    shiftTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }

  private activate(caster: Unit, x: number, y: number): void {
    const { owner } = caster;
    const level = caster.getAbilityLevel(this.wrathOfEluneAbilityId);

    const moonlight = Unit.create(owner, this.moonlightUnitTypeId, x, y);

    const t = TimerUtils.newTimer();
    this.active.set(caster, {
      moonlight,
      timer: t,
      manaCost: BlzGetUnitAbilityManaCost(
        caster.handle,
        this.wrathOfEluneAbilityId,
        level - 1,
      ),
      icon: BlzGetAbilityStringLevelField(
        caster.getAbility(this.wrathOfEluneAbilityId),
        ABILITY_SLF_ICON_NORMAL,
        level - 1,
      ),
    });
    this.setToggle(caster, true);

    t.start(1, true, () => {
      if (!moonlight.isAlive() || caster.mana < 10) {
        this.deactivate(caster);
        return;
      }
      caster.mana -= 10;

      // Night is 18:00 to 6:00
      const timeOfDay = GetFloatGameState(GAME_STATE_TIME_OF_DAY);
      const isNight = timeOfDay < 6 || timeOfDay >= 18;
      const damage =
        10 *
        caster.getAbilityLevel(this.wrathOfEluneAbilityId) *
        (isNight ? 1.5 : 1);

      const grp = Group.fromRange(350, moonlight.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;

        moonlight.damageTarget(
          u.handle,
          damage,
          false,
          false,
          ATTACK_TYPE_MAGIC,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
    });
  }

  private deactivate(caster: Unit): void {
    const active = this.active.get(caster);
    if (active == null) return;

    this.active.delete(caster);
    TimerUtils.releaseTimer(active.timer);
    active.moonlight.destroy();
    this.setToggle(caster, false, active.manaCost, active.icon);
  }

  private setToggle(
    caster: Unit,
    on: boolean,
    manaCost = 0,
    icon = "ReplaceableTextures\\CommandButtons\\BTNWrathOfEluneOff.dds",
  ): void {
    const level = caster.getAbilityLevel(this.wrathOfEluneAbilityId);
    const ability = caster.getAbility(this.wrathOfEluneAbilityId);
    BlzSetAbilityIntegerLevelField(
      ability,
      ABILITY_ILF_TARGET_TYPE,
      level - 1,
      on ? 0 : 2,
    );
    BlzSetAbilityStringLevelField(
      ability,
      ABILITY_SLF_ICON_NORMAL,
      level - 1,
      icon,
    );
    BlzSetUnitAbilityManaCost(
      caster.handle,
      this.wrathOfEluneAbilityId,
      level - 1,
      manaCost,
    );
    caster.disableAbility(this.wrathOfEluneAbilityId, true, false);
    caster.disableAbility(this.wrathOfEluneAbilityId, false, false);
  }

  private shift(moonlight: Unit, x: number, y: number): void {
    if (this.shifting.has(moonlight)) return;
    this.shifting.add(moonlight);

    let step = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      if (!moonlight.isAlive() || step > 40) {
        this.shifting.delete(moonlight);
        TimerUtils.releaseTimer(t);
        return;
      }

      if (step === 20) moonlight.setPosition(x, y);
      const alpha = step <= 20 ? 1 - step / 20 : (step - 20) / 20;
      moonlight.setVertexColor(255, 255, 255, Math.floor(255 * alpha));
    });
  }
}
