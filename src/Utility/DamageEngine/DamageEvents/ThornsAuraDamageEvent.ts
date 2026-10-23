import { Effect, Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Thorns Aura's thorns (see ThornsAura.ts): every attack an enemy lands on
// the hero or one of its thorned Treants cuts the attacker back, ranged
// attackers included
export class ThornsAuraDamageEvent implements DamageEvent {
  // The thorned units by handle id: the hero that owns the thorns, and how
  // many Thorns Aura items sheathe it
  public static readonly BEARERS = new Map<
    number,
    { hero: Unit; count: number }
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (ThornsAuraDamageEvent.BEARERS.size === 0) return;
    if (!damageInstance.isAttack) return;
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;

    const bearer = ThornsAuraDamageEvent.BEARERS.get(
      damageInstance.targetUnitId,
    );
    if (bearer == null) return;

    const attacker = Unit.fromHandle(damageInstance.source);
    if (!attacker.isAlive()) return;
    bearer.hero.damageTarget(
      attacker.handle,
      50 * bearer.count,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    Effect.createAttachment(
      "Abilities/Spells/NightElf/ThornsAura/ThornsAuraDamage.mdl",
      attacker,
      "chest",
    ).destroy();
  }
}
