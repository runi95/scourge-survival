import { DamageEngine, DamageEventType, DamageInstance } from "./DamageEngine";
import { BansheeShellDamageEvent } from "./DamageEvents/BansheeShellDamageEvent";
import { OverdriveDamageEvent } from "./DamageEvents/OverdriveDamageEvent";
import { AntiMagicShellDamageEvent } from "./DamageEvents/AntiMagicShellDamageEvent";
import { BerserkDamageEvent } from "./DamageEvents/BerserkDamageEvent";
import { CriticalStrikeDamageEvent } from "./DamageEvents/CriticalStrikeDamageEvent";
import { DeathCoilDamageEvent } from "./DamageEvents/DeathCoilDamageEvent";
import { FireboltDamageEvent } from "./DamageEvents/FireboltDamageEvent";
import { InnerFireDamageEvent } from "./DamageEvents/InnerFireDamageEvent";
import { LocustSwarmDamageEvent } from "./DamageEvents/LocustSwarmDamageEvent";
import { LongRifleDamageEvent } from "./DamageEvents/LongRifleDamageEvent";
import { MagicSurgeDamageEvent } from "./DamageEvents/MagicSurgeDamageEvent";
import { MarksmanDamageEvent } from "./DamageEvents/MarksmanDamageEvent";
import { ScattergunDamageEvent } from "./DamageEvents/ScattergunDamageEvent";
import { ScourgeBoneChimesDamageEvent } from "./DamageEvents/ScourgeBoneChimesDamageEvent";
import { StrengthInNumbersDamageEvent } from "./DamageEvents/StrengthInNumbersDamageEvent";
import { ThornsDamageEvent } from "./DamageEvents/ThornsDamageEvent";
import { ThunderSpearsDamageEvent } from "./DamageEvents/ThunderSpearsDamageEvent";
import { WarDrumsDamageEvent } from "./DamageEvents/WarDrumsDamageEvent";
import { ElunesVeilDamageEvent } from "./DamageEvents/ElunesVeilDamageEvent";
import { IronhideDamageEvent } from "./DamageEvents/IronhideDamageEvent";

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
      new LongRifleDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new ScattergunDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new MagicSurgeDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new WarDrumsDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new BerserkDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new AntiMagicShellDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new StrengthInNumbersDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new CriticalStrikeDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new OverdriveDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new MarksmanDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new ElunesVeilDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new IronhideDamageEvent(),
      DamageEventType.OnDamageEvent,
    );
    DamageEngine.register(
      new BansheeShellDamageEvent(),
      DamageEventType.OnDamageEvent,
    );

    // After damage events
    DamageEngine.register(
      new FireboltDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
    DamageEngine.register(
      new InnerFireDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
    DamageEngine.register(
      new ScourgeBoneChimesDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
    DamageEngine.register(
      new ThornsDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
    DamageEngine.register(
      new LocustSwarmDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
    DamageEngine.register(
      new ThunderSpearsDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
    DamageEngine.register(
      new DeathCoilDamageEvent(),
      DamageEventType.AfterDamageEvent,
    );
  }
}
