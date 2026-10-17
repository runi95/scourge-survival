import { Effect, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { Group } from "../../Utility/Group";
import { TimerUtils } from "../../Utility/TimerUtils";

interface SorrowChannel {
  timer: Timer;
  effect: Effect;
  level: number;
  elapsed: number;
  nextStrike: number;
  hits: number;
}

export class GatheringSorrow {
  private readonly sorrowAbilityId = FourCC("A04S");
  private readonly strikeDamage = [40, 60, 80];
  private readonly strikeIntelligence = 0.5;
  private readonly explosionDamagePerHit = [20, 30, 40];

  private readonly channels = new Map<number, SorrowChannel>();

  constructor() {
    const castTrig = Trigger.create();
    castTrig.addAction(() => {
      if (GetSpellAbilityId() !== this.sorrowAbilityId) return;
      this.start(Unit.fromEvent());
    });
    castTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);

    const endTrig = Trigger.create();
    endTrig.addAction(() => {
      if (GetSpellAbilityId() !== this.sorrowAbilityId) return;
      this.finish(Unit.fromEvent());
    });
    endTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_ENDCAST);
  }

  private start(banshee: Unit): void {
    this.finish(banshee);

    const channel: SorrowChannel = {
      timer: TimerUtils.newTimer(),
      effect: Effect.createAttachment(
        "Abilities\\Spells\\Demon\\DarkConversion\\ZombifyTarget.mdl",
        banshee,
        "origin",
      ),
      level: banshee.getAbilityLevel(this.sorrowAbilityId),
      elapsed: 0,
      nextStrike: 0.75,
      hits: 0,
    };
    this.channels.set(banshee.id, channel);

    channel.timer.start(0.05, true, () => {
      channel.elapsed += 0.05;
      if (
        !banshee.isAlive() ||
        banshee.currentOrder !== OrderId.Starfall ||
        channel.elapsed > 5.5
      ) {
        this.finish(banshee);
        return;
      }

      while (channel.elapsed >= channel.nextStrike) {
        if (this.strike(banshee, channel.level)) channel.hits++;
        channel.nextStrike += this.interval(channel.nextStrike);
      }
    });
  }

  private interval(elapsed: number): number {
    const progress = Math.min(elapsed, 5) / 5;
    return 0.75 - (0.75 - 0.1) * progress;
  }

  private strike(banshee: Unit, level: number): boolean {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(600, banshee.point);
    grp.for((u) => {
      if (u.isAlive() && u.isEnemy(banshee.owner)) enemies.push(u);
    });
    grp.destroy();
    if (enemies.length === 0) return false;

    const target = enemies[GetRandomInt(0, enemies.length - 1)];
    const damage =
      this.strikeDamage[level - 1] +
      banshee.getIntelligence(true) * this.strikeIntelligence;
    banshee.damageTarget(
      target.handle,
      damage,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );

    Effect.createAttachment(
      "Objects\\Spawnmodels\\Undead\\UndeadDissipate\\UndeadDissipate.mdl",
      target,
      "origin",
    ).destroy();
    return true;
  }

  private finish(banshee: Unit): void {
    const channel = this.channels.get(banshee.id);
    if (channel == null) return;
    this.channels.delete(banshee.id);
    TimerUtils.releaseTimer(channel.timer);
    channel.effect.destroy();

    if (!banshee.isAlive() || channel.hits === 0) return;
    this.explode(
      banshee,
      channel.hits * this.explosionDamagePerHit[channel.level - 1],
      channel.hits,
    );
  }

  private explode(banshee: Unit, damage: number, hits: number): void {
    const blast = Effect.create(
      "Objects\\Spawnmodels\\Undead\\UCancelDeath\\UCancelDeath.mdl",
      banshee.x,
      banshee.y,
    );
    blast.setTime(0.5);
    blast.scale = 1 + Math.min(hits, 20) * 0.1;
    blast.destroy();
    Effect.create(
      "Abilities\\Spells\\Human\\Thunderclap\\ThunderClapCaster.mdl",
      banshee.x,
      banshee.y,
    ).destroy();

    const grp = Group.fromRange(600, banshee.point);
    grp.for((u) => {
      if (!u.isAlive() || !u.isEnemy(banshee.owner)) return;
      banshee.damageTarget(
        u.handle,
        damage,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }
}
