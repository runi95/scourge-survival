import { Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../Utility/TimerUtils";
import { GameMap } from "../../Game/GameMap";

export class HowlOfTerror {
  private readonly howlOfTerrorTrig: Trigger;
  private readonly howlOfTerrorTrigAbilityId = FourCC("A01Q");
  private readonly howlOfTerrorAbilityId = FourCC("A01P");

  private readonly playerTimers: Timer[] = [];

  constructor() {
    this.howlOfTerrorTrig = Trigger.create();
    this.howlOfTerrorTrig.addAction(() => {
      const ability = GetSpellAbilityId();
      if (ability !== this.howlOfTerrorTrigAbilityId) return;

      const triggeringUnit = Unit.fromEvent();
      const { owner } = triggeringUnit;
      const ownerId = owner.id;

      const playerId = ownerId - 9;
      const vehicle = GameMap.PLAYER_VEHICLES[playerId];
      if (vehicle.unit == null) return;

      vehicle.unit.addAbility(this.howlOfTerrorAbilityId);
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
          vehicle.unit.removeAbility(this.howlOfTerrorAbilityId);
          TimerUtils.releaseTimer(t);
        }
      });
    });

    this.howlOfTerrorTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_CAST);
  }
}
