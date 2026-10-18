import { Effect, MapPlayer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { DamageEvent } from "../DamageEvent";
import type { ExtendedDamageInstance } from "../DamageEventController";
import { Globals } from "../../Globals";
import { Group } from "../../Group";
import { RandomNumberGenerator } from "../../RandomNumberGenerator";
import { TimerUtils } from "../../TimerUtils";

// Rupture's spikes (see Rupture.ts): every enemy they hit is crippled, and an
// enemy that already was ruptures and sends the spikes on towards the next
export class RuptureDamageEvent implements DamageEvent {
  private static readonly casterUnitTypeId = FourCC("u027");
  private static readonly impaleAbilityId = FourCC("A00A");
  private static readonly maxRuptures = 3;
  // How many ruptures led to each caster's spikes, by caster handle id
  private static readonly depths = new Map<number, number>();

  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly crippleAbilityId = FourCC("A03P");
  private readonly crippleBuffId = FourCC("Bcri");

  public static impale(
    owner: MapPlayer,
    fromX: number,
    fromY: number,
    towardsX: number,
    towardsY: number,
    depth: number,
  ): void {
    const caster = Unit.create(
      owner,
      RuptureDamageEvent.casterUnitTypeId,
      fromX,
      fromY,
    );
    caster.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    caster.addAbility(RuptureDamageEvent.impaleAbilityId);
    caster.issueOrderAt("impale", towardsX, towardsY);
    const id = caster.id;
    RuptureDamageEvent.depths.set(id, depth);
    const t = TimerUtils.newTimer();
    t.start(3, false, () => {
      TimerUtils.releaseTimer(t);
      RuptureDamageEvent.depths.delete(id);
    });
  }

  public event(damageInstance: ExtendedDamageInstance): void {
    if (damageInstance.damage < 1) return;
    if (damageInstance.sourceUnitTypeId !== RuptureDamageEvent.casterUnitTypeId)
      return;
    if (damageInstance.sourceOwningPlayerId > 8) return;
    if (damageInstance.targetOwningPlayerId < 9) return;

    const owner = MapPlayer.fromHandle(damageInstance.sourceOwningPlayer);
    const target = Unit.fromHandle(damageInstance.target);
    if (target.getAbilityLevel(this.crippleBuffId) === 0) {
      const dummy = Unit.create(
        owner,
        this.dummyUnitTypeId,
        target.x,
        target.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, target);
      return;
    }

    const depth = RuptureDamageEvent.depths.get(damageInstance.sourceUnitId);
    if (depth == null || depth >= RuptureDamageEvent.maxRuptures) return;

    const { x, y } = target;
    Effect.create(
      "Objects/Spawnmodels/Undead/UndeadLargeDeathExplode/UndeadLargeDeathExplode.mdl",
      x,
      y,
    ).destroy();
    UnitDamageTarget(
      damageInstance.source,
      damageInstance.target,
      150,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );

    // The spikes burst on towards another enemy nearby, crippled ones first
    const crippled: Unit[] = [];
    const next: Unit[] = [];
    const grp = Group.fromRange(400, target.point);
    grp.for((u) => {
      if (u.handle === target.handle) return;
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      if (u.getAbilityLevel(this.crippleBuffId) > 0) crippled.push(u);
      else next.push(u);
    });
    grp.destroy();
    const options = crippled.length > 0 ? crippled : next;
    if (options.length === 0) return;

    const towards =
      options[RandomNumberGenerator.random(0, options.length - 1)];
    RuptureDamageEvent.impale(owner, x, y, towards.x, towards.y, depth + 1);
  }
}
