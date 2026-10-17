import { Effect, Trigger, Unit } from "w3ts";
import { GameMap } from "../../Game/GameMap";
import { TimerUtils } from "../../Utility/TimerUtils";

export class SoulReap {
  public static readonly SOULS: number[] = [];
  private static readonly SOUL_REAP_EFFECT_ABILITY_ID: [
    number,
    number,
    number,
  ] = [FourCC("A013"), FourCC("A014"), FourCC("A015")];

  private static readonly MAX_SOULS = 3;

  private readonly soulReapAbilityId = FourCC("A04N");
  private readonly locustAbilityId = FourCC("Aloc");
  private readonly range = 600;
  private readonly soulChance = 0.1;
  private readonly cooldownReduction = [0.22, 0.34, 0.46, 0.58, 0.7];

  constructor() {
    const deathTrig = Trigger.create();
    deathTrig.addAction(() => this.harvest(Unit.fromEvent()));
    deathTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);

    const castTrig = Trigger.create();
    castTrig.addAction(() => this.spend(Unit.fromEvent(), GetSpellAbilityId()));
    castTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }

  public static setSouls(playerId: number, souls: number): void {
    souls = Math.max(0, Math.min(SoulReap.MAX_SOULS, souls));
    const banshee = GameMap.PLAYER_VEHICLES[playerId].unit;

    switch (souls) {
      case 0:
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[0]);
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[1]);
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[2]);
        break;
      case 1:
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[1]);
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[2]);
        banshee.addAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[0]);
        break;
      case 2:
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[0]);
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[2]);
        banshee.addAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[1]);
        break;
      case 3:
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[0]);
        banshee.removeAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[1]);
        banshee.addAbility(this.SOUL_REAP_EFFECT_ABILITY_ID[2]);
        break;
    }

    SoulReap.SOULS[playerId] = souls;
  }

  private harvest(dying: Unit): void {
    if (dying.getAbilityLevel(this.locustAbilityId) > 0) return;

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
      const banshee = GameMap.PLAYER_VEHICLES[playerId].unit;
      if (banshee == null || !banshee.isAlive()) continue;
      if (banshee.getAbilityLevel(this.soulReapAbilityId) < 1) continue;
      if (!dying.isEnemy(banshee.owner)) continue;

      const souls = SoulReap.SOULS[playerId] ?? 0;
      if (souls >= SoulReap.MAX_SOULS) continue;

      const dx = dying.x - banshee.x;
      const dy = dying.y - banshee.y;
      if (dx * dx + dy * dy > this.range * this.range) continue;
      if (GetRandomReal(0, 1) > this.soulChance) continue;

      SoulReap.setSouls(playerId, souls + 1);
      Effect.create(
        "Abilities\\Spells\\Undead\\Possession\\PossessionMissile.mdl",
        dying.x,
        dying.y,
      ).destroy();
    }
  }

  private spend(caster: Unit, abilityId: number): void {
    const playerId = caster.owner.id;
    if (playerId > 8) return;
    if (GameMap.PLAYER_VEHICLES[playerId].unit?.handle !== caster.handle)
      return;

    const souls = SoulReap.SOULS[playerId] ?? 0;
    if (souls <= 0) return;
    const level = caster.getAbilityLevel(this.soulReapAbilityId);
    if (level < 1) return;

    const cooldown = caster.getAbilityCooldown(
      abilityId,
      caster.getAbilityLevel(abilityId) - 1,
    );
    if (cooldown <= 0) return;

    SoulReap.setSouls(playerId, souls - 1);
    const reduced = cooldown * (1 - this.cooldownReduction[level - 1]);
    Effect.createAttachment(
      "Abilities\\Spells\\Undead\\Possession\\PossessionCaster.mdl",
      caster,
      "origin",
    ).destroy();

    const t = TimerUtils.newTimer();
    t.start(0, false, () => {
      TimerUtils.releaseTimer(t);
      caster.startAbilityCooldown(abilityId, reduced);
    });
  }
}
