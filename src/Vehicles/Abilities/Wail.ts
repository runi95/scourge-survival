import { Point, Trigger, Unit } from "w3ts";
import { Group } from "../../Utility/Group";

export class Wail {
  private readonly wailAbilityId = FourCC("A02Q");
  private readonly baseDamage = [60, 100, 140, 180, 220];

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.wailAbilityId) return;

      const banshee = Unit.fromEvent();
      const level = banshee.getAbilityLevel(this.wailAbilityId);
      const damage = this.baseDamage[level - 1] + banshee.getIntelligence(true);

      const grp = Group.fromRange(450, banshee.point);
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
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);
  }
}
