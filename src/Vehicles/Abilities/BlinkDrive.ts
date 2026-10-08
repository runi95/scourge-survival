import { Effect, Trigger, Unit } from "w3ts";
import { Group } from "../../Utility/Group";

interface Charge {
  effect: Effect;
  x: number;
  y: number;
}

export class BlinkDrive {
  private readonly blinkDriveAbilityId = FourCC("A03O");
  private readonly charges = new Map<Unit, Charge>();

  constructor() {
    const startTrig = Trigger.create();
    startTrig.addAction(() => {
      if (GetSpellAbilityId() !== this.blinkDriveAbilityId) return;

      const siegeEngine = Unit.fromEvent();
      this.charges.get(siegeEngine)?.effect.destroy();
      this.charges.set(siegeEngine, {
        effect: Effect.createAttachment(
          "Abilities\\Spells\\Orc\\LightningShield\\LightningShieldTarget.mdl",
          siegeEngine,
          "origin",
        ),
        x: GetSpellTargetX(),
        y: GetSpellTargetY(),
      });
    });
    startTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);

    const finishTrig = Trigger.create();
    finishTrig.addAction(() => {
      if (GetSpellAbilityId() !== this.blinkDriveAbilityId) return;

      const siegeEngine = Unit.fromEvent();
      const charge = this.charges.get(siegeEngine);
      if (charge == null) return;

      this.charges.delete(siegeEngine);
      charge.effect.destroy();
      this.blinkAndSlam(siegeEngine, charge.x, charge.y);
    });
    finishTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_FINISH);

    const endTrig = Trigger.create();
    endTrig.addAction(() => {
      if (GetSpellAbilityId() !== this.blinkDriveAbilityId) return;

      const siegeEngine = Unit.fromEvent();
      this.charges.get(siegeEngine)?.effect.destroy();
      this.charges.delete(siegeEngine);
    });
    endTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_ENDCAST);
  }

  private blinkAndSlam(siegeEngine: Unit, x: number, y: number): void {
    Effect.create(
      "Abilities\\Spells\\NightElf\\Blink\\BlinkCaster.mdl",
      siegeEngine.x,
      siegeEngine.y,
    ).destroy();
    siegeEngine.setPosition(x, y);
    Effect.create(
      "Abilities\\Spells\\NightElf\\Blink\\BlinkTarget.mdl",
      siegeEngine.x,
      siegeEngine.y,
    ).destroy();
    Effect.create(
      "Abilities\\Spells\\Human\\ThunderClap\\ThunderClapCaster.mdl",
      siegeEngine.x,
      siegeEngine.y,
    ).destroy();

    const { owner } = siegeEngine;
    const damage = 75 * siegeEngine.getAbilityLevel(this.blinkDriveAbilityId);
    const grp = Group.fromRange(250, siegeEngine.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      siegeEngine.damageTarget(
        u.handle,
        damage,
        false,
        false,
        ATTACK_TYPE_SIEGE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }
}
