import { Timer, Unit } from "w3ts";
import { GameMap } from "../../../Game/GameMap";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { TimerUtils } from "../../TimerUtils";
import { Globals } from "../../Globals";

export class InnerFireDamageEvent implements DamageEvent {
  public static READY_INSTANCES = 0;

  private readonly gameMap: GameMap;

  private readonly playerTimers: Timer[] = [];

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly innerFireAbilityId: number = FourCC("A00Z");

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.targetOwningPlayerId > 8) return;
    if (InnerFireDamageEvent.READY_INSTANCES === 0) return;

    const vehicle =
      this.gameMap.playerVehicles[damageInstance.targetOwningPlayerId];
    if (vehicle == null) return;

    const innerFireLevel = vehicle.upgradeMap.get("Inner Fire");
    if (innerFireLevel == null) return;
    if (innerFireLevel < 1) return;

    const cooldown = vehicle.cooldowns.get("Inner Fire");
    if (cooldown > 0) return;

    InnerFireDamageEvent.READY_INSTANCES--;
    vehicle.cooldowns.set("Inner Fire", 60);

    const owner = vehicle.unit.owner;
    const { x, y } = vehicle.unit;
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.innerFireAbilityId);
    if (innerFireLevel > 1) {
      dummy.setAbilityLevel(this.innerFireAbilityId, innerFireLevel);
    }

    dummy.issueTargetOrder("innerfire", vehicle.unit);

    const t: Timer = TimerUtils.newTimer();
    this.playerTimers[owner.id] = t;
    t.start(60, false, () => {
      TimerUtils.releaseTimer(t);
      vehicle.cooldowns.set("Inner Fire", 0);
      InnerFireDamageEvent.READY_INSTANCES++;
    });
  }
}
