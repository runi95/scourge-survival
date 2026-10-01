import { Effect } from "w3ts";
import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";

export class DeathCoilDamageEvent implements DamageEvent {
  private readonly deathCoilTotemUnitTypeId = FourCC("u018");

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId < 9) return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.sourceUnitTypeId !== this.deathCoilTotemUnitTypeId)
      return;

    const hero =
      GameMap.PLAYER_VEHICLES[damageInstance.sourceOwningPlayerId]?.unit;
    if (hero == null || !hero.isAlive()) return;

    hero.life = hero.life + 50;
    Effect.createAttachment(
      "Abilities/Spells/Undead/DeathCoil/DeathCoilSpecialArt.mdl",
      hero,
      "origin",
    ).destroy();
  }
}
