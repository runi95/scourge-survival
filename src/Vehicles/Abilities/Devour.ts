import { Effect, Trigger, Unit } from "w3ts";
import { GameMap } from "../../Game/GameMap";

export class Devour {
  private readonly devourAbilityId = FourCC("A00W");
  private readonly locustAbilityId = FourCC("Aloc");

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      if (dying.getAbilityLevel(this.locustAbilityId) > 0) return;

      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const kodo = GameMap.PLAYER_VEHICLES[playerId].unit;
        if (kodo == null || !kodo.isAlive()) continue;

        const level = kodo.getAbilityLevel(this.devourAbilityId);
        if (level < 1) continue;
        if (!dying.isEnemy(kodo.owner)) continue;

        const dx = dying.x - kodo.x;
        const dy = dying.y - kodo.y;
        if (dx * dx + dy * dy > 600 * 600) continue;

        kodo.life += 10 * level;
        Effect.createAttachment(
          "Abilities\\Spells\\Items\\AIhe\\AIheTarget.mdl",
          kodo,
          "origin",
        ).destroy();
      }
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }
}
