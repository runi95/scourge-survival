import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Dragnet's waves and nets (see Dragnet.ts): every scourge unit a wave hits is
// handed to its recipe, and so is every hurt taken by a unit in a net, which
// it shares out as spirit link damage (never shared again)
export class DragnetDamageEvent implements DamageEvent {
  // The shockwave casters by handle id, with what to do with the unit hit
  public static readonly WAVES = new Map<
    number,
    (this: void, struck: Unit) => void
  >();
  // The netted units by handle id, with what to do with the hurt they take
  public static readonly NETTED = new Map<
    number,
    (this: void, hurt: Unit, damage: number) => void
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (
      DragnetDamageEvent.WAVES.size === 0 &&
      DragnetDamageEvent.NETTED.size === 0
    ) {
      return;
    }
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.damageType === DAMAGE_TYPE_SPIRIT_LINK) return;

    const struck = DragnetDamageEvent.WAVES.get(damageInstance.sourceUnitId);
    if (struck != null) struck(Unit.fromHandle(damageInstance.target));

    const share = DragnetDamageEvent.NETTED.get(damageInstance.targetUnitId);
    if (share != null) {
      share(Unit.fromHandle(damageInstance.target), damageInstance.damage);
    }
  }
}
