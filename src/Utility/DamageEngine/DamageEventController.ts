import { GameMap } from "../../Game/GameMap";
import { DamageEngine, DamageEventType, DamageInstance } from "./DamageEngine";
import { BerserkDamageEvent } from "./DamageEvents/BerserkDamageEvent";
import { CriticalStrikeDamageEvent } from "./DamageEvents/CriticalStrikeDamageEvent";
import { InnerFireDamageEvent } from "./DamageEvents/InnerFireDamageEvent";
import { MagicSurgeDamageEvent } from "./DamageEvents/MagicSurgeDamageEvent";
import { ScourgeBoneChimesDamageEvent } from "./DamageEvents/ScourgeBoneChimesDamageEvent";
import { ThornsDamageEvent } from "./DamageEvents/ThornsDamageEvent";
import { UnholyAuraDamageEvent } from "./DamageEvents/UnholyAuraDamageEvent";
import { WarDrumsDamageEvent } from "./DamageEvents/WarDrumsDamageEvent";

export interface ExtendedDamageInstance extends DamageInstance {
  sourceOwningPlayer: player;
  targetOwningPlayer: player;
  sourceOwningPlayerId: number;
  targetOwningPlayerId: number;
  sourceUnitId: number;
  targetUnitId: number;
  sourceUnitTypeId: number;
  targetUnitTypeId: number;
}

export class DamageEventController {
  private readonly gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;

    DamageEngine.registerTransformer((d: ExtendedDamageInstance) => {
      d.sourceOwningPlayer = GetOwningPlayer(d.source);
      d.targetOwningPlayer = GetOwningPlayer(d.target);
      d.sourceOwningPlayerId = GetPlayerId(d.sourceOwningPlayer);
      d.targetOwningPlayerId = GetPlayerId(d.targetOwningPlayer);
      d.sourceUnitId = GetHandleId(d.source);
      d.targetUnitId = GetHandleId(d.target);
      d.sourceUnitTypeId = GetUnitTypeId(d.source);
      d.targetUnitTypeId = GetUnitTypeId(d.target);

      return d;
    });

    // Pre damage events

    // On damage events
    DamageEngine.register(
      new MagicSurgeDamageEvent(this.gameMap),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new WarDrumsDamageEvent(this.gameMap),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new BerserkDamageEvent(this.gameMap),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new CriticalStrikeDamageEvent(this.gameMap),
      DamageEventType.OnDamageEvent
    );

    // After damage events
    DamageEngine.register(
      new InnerFireDamageEvent(this.gameMap),
      DamageEventType.AfterDamageEvent
    );
    DamageEngine.register(
      new ScourgeBoneChimesDamageEvent(this.gameMap),
      DamageEventType.AfterDamageEvent
    );
    DamageEngine.register(
      new ThornsDamageEvent(this.gameMap),
      DamageEventType.AfterDamageEvent
    );

    // Lethal damage events
    DamageEngine.register(
      new UnholyAuraDamageEvent(this.gameMap),
      DamageEventType.LethalDamageEvent
    );
  }
}
