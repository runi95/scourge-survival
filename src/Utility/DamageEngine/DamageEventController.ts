import { DamageEngine, DamageEventType, DamageInstance } from "./DamageEngine";
import { AntiMagicShellDamageEvent } from "./DamageEvents/AntiMagicShellDamageEvent";
import { BerserkDamageEvent } from "./DamageEvents/BerserkDamageEvent";
import { CriticalStrikeDamageEvent } from "./DamageEvents/CriticalStrikeDamageEvent";
import { InnerFireDamageEvent } from "./DamageEvents/InnerFireDamageEvent";
import { MagicSurgeDamageEvent } from "./DamageEvents/MagicSurgeDamageEvent";
import { ScourgeBoneChimesDamageEvent } from "./DamageEvents/ScourgeBoneChimesDamageEvent";
import { StrengthInNumbersDamageEvent } from "./DamageEvents/StrengthInNumbersDamageEvent";
import { ThornsDamageEvent } from "./DamageEvents/ThornsDamageEvent";
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
  constructor() {
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
      new MagicSurgeDamageEvent(),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new WarDrumsDamageEvent(),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new BerserkDamageEvent(),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new AntiMagicShellDamageEvent(),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new StrengthInNumbersDamageEvent(),
      DamageEventType.OnDamageEvent
    );
    DamageEngine.register(
      new CriticalStrikeDamageEvent(),
      DamageEventType.OnDamageEvent
    );

    // After damage events
    DamageEngine.register(
      new InnerFireDamageEvent(),
      DamageEventType.AfterDamageEvent
    );
    DamageEngine.register(
      new ScourgeBoneChimesDamageEvent(),
      DamageEventType.AfterDamageEvent
    );
    DamageEngine.register(
      new ThornsDamageEvent(),
      DamageEventType.AfterDamageEvent
    );
  }
}
