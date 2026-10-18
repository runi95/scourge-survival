import { Effect, Item, MapPlayer, Point, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Ice spikes that leave a ridge of ice behind for 4 seconds: it slows every
// enemy standing on it, and an enemy killed while slowed by it shatters,
// driving spikes on from where it died
export class GlacialSpikes extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0B8");
  public readonly merchantItemTypeId = FourCC("I0B9");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly spikesAbilityId: number = FourCC("A050");
  private readonly chillAbilityId: number = FourCC("A04W");
  // Enemies slowed by a ridge: handle id -> the chill and who cast it
  private readonly slowed = new Map<
    number,
    { chill: number; owner: MapPlayer }
  >();
  private chillCount = 0;

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      const slowed = this.slowed.get(dying.id);
      if (slowed == null) return;
      this.slowed.delete(dying.id);

      const { x, y } = dying;
      Effect.create(
        "Abilities/Weapons/FrostWyrmMissile/FrostWyrmMissile.mdl",
        x,
        y,
      ).destroy();
      const towards = this.nearest(slowed.owner, x, y);
      if (towards != null)
        this.spikes(slowed.owner, x, y, towards.x, towards.y);
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const target =
        this.largestGroup(vehicle.unit, owner) ?? this.nearest(owner, x, y);
      if (target == null) return;

      this.spikes(owner, x, y, target.x, target.y);
      const angle = Math.atan2(target.y - y, target.x - x);
      this.ridge(
        owner,
        x,
        y,
        x + 600 * Math.cos(angle),
        y + 600 * Math.sin(angle),
      );
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }

  private spikes(
    owner: MapPlayer,
    x: number,
    y: number,
    towardsX: number,
    towardsY: number,
  ): void {
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    dummy.addAbility(this.spikesAbilityId);
    dummy.issueOrderAt("impale", towardsX, towardsY);
  }

  private ridge(
    owner: MapPlayer,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    const ice: Effect[] = [];
    for (let i = 1; i <= 6; i++) {
      const effect = Effect.create(
        "Abilities/Spells/Undead/FreezingBreath/FreezingBreathTargetArt.mdl",
        fromX + ((toX - fromX) * i) / 6,
        fromY + ((toY - fromY) * i) / 6,
      );
      effect.scale = 0.7;
      ice.push(effect);
    }

    const dx = toX - fromX;
    const dy = toY - fromY;
    const length2 = dx * dx + dy * dy;
    const middle = Point.create((fromX + toX) / 2, (fromY + toY) / 2);
    // Enemies this ridge slowed in the last 2.5 seconds, by handle id
    const chilled = new Map<number, number>();
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.25, true, () => {
      elapsed += 0.25;
      const grp = Group.fromRange(380, middle);
      grp.for((u) => {
        if (!this.isVictim(u, owner)) return;
        if ((chilled.get(u.id) ?? -10) > elapsed - 2.5) return;

        // Within 80 of the ridge
        const along = Math.max(
          0,
          Math.min(1, ((u.x - fromX) * dx + (u.y - fromY) * dy) / length2),
        );
        const px = fromX + along * dx - u.x;
        const py = fromY + along * dy - u.y;
        if (px * px + py * py > 80 * 80) return;

        chilled.set(u.id, elapsed);
        this.chill(owner, u);
      });
      grp.destroy();
      if (elapsed < 4) return;

      TimerUtils.releaseTimer(t);
      middle.destroy();
      for (const effect of ice) effect.destroy();
    });
  }

  private chill(owner: MapPlayer, u: Unit): void {
    const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.chillAbilityId);
    dummy.issueTargetOrder(OrderId.Slow, u);

    // It can shatter for the 3 seconds it is slowed
    const chill = ++this.chillCount;
    const id = u.id;
    this.slowed.set(id, { chill, owner });
    const t = TimerUtils.newTimer();
    t.start(3, false, () => {
      TimerUtils.releaseTimer(t);
      if (this.slowed.get(id)?.chill === chill) this.slowed.delete(id);
    });
  }

  private nearest(owner: MapPlayer, x: number, y: number): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDistance = 0;
    const at = Point.create(x, y);
    const grp = Group.fromRange(600, at);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (nearest != null && distance >= nearestDistance) return;
      nearest = u;
      nearestDistance = distance;
    });
    grp.destroy();
    at.destroy();
    return nearest;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(600, source.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;

      candidates.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let bestCount = 0;
    for (const candidate of candidates) {
      let count = 0;
      for (const other of candidates) {
        const distance = Math.sqrt(
          Math.pow(other.x - candidate.x, 2) +
            Math.pow(other.y - candidate.y, 2),
        );
        if (distance <= 200) count++;
      }

      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  }
}
