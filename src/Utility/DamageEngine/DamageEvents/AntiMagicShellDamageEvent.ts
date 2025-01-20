import { TextTag } from "../../../../node_modules/w3ts/index";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class AntiMagicShellDamageEvent implements DamageEvent {
  public static UNIT_ID: (number | null)[] = [];

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (
      AntiMagicShellDamageEvent.UNIT_ID[damageInstance.targetOwningPlayerId] !==
      damageInstance.targetUnitId
    ) {
      return;
    }

    const healedAmount = damageInstance.damage;
    damageInstance.damage *= -1;

    const txt = TextTag.create();
    txt.setText(`${Math.floor(healedAmount).toString()}!`, 0.023);
    txt.setPos(
      GetUnitX(damageInstance.target),
      GetUnitY(damageInstance.target),
      BlzGetUnitZ(damageInstance.target)
    );
    txt.setColor(0.0, 255.0, 0.0, 255.0);
    txt.setPermanent(false);
    txt.setLifespan(4.0);
    txt.setVelocity(0, 0.04);
    txt.setFadepoint(2.5);
  }
}
