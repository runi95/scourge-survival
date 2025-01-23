import { Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../Utility/TimerUtils";
import { GameMap } from "../../Game/GameMap";

export class UnholyFrenzy {
  private readonly unholyFrenzyTrig: Trigger;
  private readonly unholyFrenzyTrigAbilityId = FourCC("A01Q");
  private readonly unholyFrenzyAbilityId = FourCC("A01P");

  private readonly gameMap: GameMap;
  private readonly playerTimers: Timer[] = [];

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.unholyFrenzyTrig = Trigger.create();
    this.unholyFrenzyTrig.addAction(() => {
      const ability = GetSpellAbilityId();
      if (ability !== this.unholyFrenzyTrigAbilityId) return;

      const triggeringUnit = Unit.fromEvent();
      const { owner } = triggeringUnit;
      const ownerId = owner.id;

      const playerId = ownerId - 9;
      const vehicle = this.gameMap.playerVehicles[playerId];
      if (vehicle == null) return;

      vehicle.unit.addAbility(this.unholyFrenzyAbilityId);
      const t: Timer = TimerUtils.newTimer();
      this.playerTimers[playerId] = t;

      let lastKnownX = vehicle.unit.x;
      let lastKnownY = vehicle.unit.y;

      let ticks = 100;
      t.start(0.1, true, () => {
        const { x, y } = vehicle.unit;
        const dist = Math.sqrt(
          Math.pow(lastKnownX - x, 2) + Math.pow(lastKnownY - y, 2)
        );
        lastKnownX = x;
        lastKnownY = y;

        if (dist < 1) {
          triggeringUnit.damageTarget(
            vehicle.unit.handle,
            30,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_NORMAL,
            WEAPON_TYPE_WHOKNOWS
          );
        }

        if (--ticks <= 0) {
          vehicle.unit.removeAbility(this.unholyFrenzyAbilityId);
          TimerUtils.releaseTimer(t);
        }
      });
    });

    this.unholyFrenzyTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_CAST);
  }
}
