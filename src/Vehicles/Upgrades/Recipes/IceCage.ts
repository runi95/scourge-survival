import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

export class IceCage extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0B6");
  public readonly merchantItemTypeId = FourCC("I0B7");
  public readonly recipe: number[] = [FourCC("I001"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chillAbilityId: number = FourCC("A04W");
  private readonly radius = 250;

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

      const center = this.largestGroup(vehicle.unit, owner);
      if (center != null) this.cage(owner, center[0], center[1]);
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

  private cage(owner: MapPlayer, x: number, y: number): void {
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8;
      const spike = Effect.create(
        "Abilities/Spells/Undead/Impale/ImpaleMissTarget.mdl",
        x + this.radius * Math.cos(angle),
        y + this.radius * Math.sin(angle),
      );
      spike.setColor(150, 200, 255);
      spike.destroy();
    }

    // Which side of the ring each enemy was on, by handle id
    const inside = new Map<number, boolean>();
    const impaled = new Set<number>();
    const center = Point.create(x, y);
    const grp = Group.fromRange(this.radius + 60, center);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      const distance = Math.sqrt((u.x - x) * (u.x - x) + (u.y - y) * (u.y - y));
      inside.set(u.id, distance < this.radius);
      if (distance >= this.radius - 60) {
        this.impale(dummy, u, impaled);
        return;
      }
      dummy.damageTarget(
        u.handle,
        75,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      const chiller = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      chiller.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      chiller.addAbility(this.chillAbilityId);
      chiller.issueTargetOrder(OrderId.Slow, u);
    });
    grp.destroy();

    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.2, true, () => {
      elapsed += 0.2;
      const near = Group.fromRange(this.radius + 200, center);
      near.for((u) => {
        if (!this.isVictim(u, owner)) return;

        const distance = Math.sqrt(
          (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y),
        );
        const now = distance < this.radius;
        const before = inside.get(u.id);
        inside.set(u.id, now);
        if (before != null && before !== now) this.impale(dummy, u, impaled);
      });
      near.destroy();
      if (elapsed < 3) return;

      TimerUtils.releaseTimer(t);
      center.destroy();
    });
  }

  // Every enemy is impaled by a cage at most once
  private impale(dummy: Unit, u: Unit, impaled: Set<number>): void {
    if (impaled.has(u.id)) return;
    impaled.add(u.id);

    Effect.createAttachment(
      "Abilities/Spells/Undead/Impale/ImpaleHitTarget.mdl",
      u,
      "origin",
    ).destroy();
    StunUtils.stunUnit(u.handle, 1);
    dummy.damageTarget(
      u.handle,
      150,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }

  // The middle of the largest group
  private largestGroup(
    source: Unit,
    owner: MapPlayer,
  ): [number, number] | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(700, source.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;

      candidates.push(u);
    });
    grp.destroy();

    let best: [number, number] | undefined;
    let bestCount = 0;
    for (const candidate of candidates) {
      let count = 0;
      let sumX = 0;
      let sumY = 0;
      for (const other of candidates) {
        const distance = Math.sqrt(
          Math.pow(other.x - candidate.x, 2) +
            Math.pow(other.y - candidate.y, 2),
        );
        if (distance > this.radius) continue;
        count++;
        sumX += other.x;
        sumY += other.y;
      }

      if (count > bestCount) {
        best = [sumX / count, sumY / count];
        bestCount = count;
      }
    }

    return best;
  }
}
