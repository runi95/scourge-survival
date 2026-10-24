import { Unit } from "w3ts";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

// Forward Outpost's cover (see ForwardOutpost.ts): every scourge unit that
// hurts an outpost or a hero with outposts is handed to their recipes, which
// shell it
export class ForwardOutpostDamageEvent implements DamageEvent {
  // The outposts and their heroes by handle id, with what to do with the
  // attacker
  public static readonly COVERED = new Map<
    number,
    ((this: void, attacker: Unit) => void)[]
  >();

  public event(damageInstance: ExtendedDamageInstance): void {
    if (ForwardOutpostDamageEvent.COVERED.size === 0) return;
    if (damageInstance.sourceOwningPlayerId < 9) return;

    const answers = ForwardOutpostDamageEvent.COVERED.get(
      damageInstance.targetUnitId,
    );
    if (answers == null) return;
    const attacker = Unit.fromHandle(damageInstance.source);
    if (attacker == null) return;
    for (const answer of answers) answer(attacker);
  }

  public static cover(
    id: number,
    answer: (this: void, attacker: Unit) => void,
  ) {
    const answers = ForwardOutpostDamageEvent.COVERED.get(id);
    if (answers == null) ForwardOutpostDamageEvent.COVERED.set(id, [answer]);
    else answers.push(answer);
  }

  public static uncover(
    id: number,
    answer: (this: void, attacker: Unit) => void,
  ) {
    const answers = ForwardOutpostDamageEvent.COVERED.get(id);
    if (answers == null) return;
    const i = answers.indexOf(answer);
    if (i >= 0) answers.splice(i, 1);
    if (answers.length === 0) ForwardOutpostDamageEvent.COVERED.delete(id);
  }
}
