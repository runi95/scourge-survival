import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// A ring of 12 shadow bolts forms 450 around the largest group and closes in
// on it from every side, cursing every enemy it passes through like Shadow
// Bolt does. Where the bolts meet, their cold bursts in a Frost Nova that
// hurts every enemy 20% more for every curse it carries
export class Implosion extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0AU");
  public readonly merchantItemTypeId = FourCC("I0AV");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly frostNovaAbilityId: number = FourCC("A03B");
  // The Shadow Bolt curse: its level is how many curses an enemy carries
  private readonly curseAbilityId: number = FourCC("A016");

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
      if (center == null) return;

      this.implode(owner, center.x, center.y);
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

  // The bolts fly 30 inwards every 0.05 seconds, 0.75 seconds in all
  private implode(owner: MapPlayer, cx: number, cy: number): void {
    const bolts: Effect[] = [];
    const pierced: Set<number>[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const bolt = Effect.create(
        "Abilities/Weapons/NecromancerMissile/NecromancerMissile.mdl",
        cx + 450 * Math.cos(angle),
        cy + 450 * Math.sin(angle),
      );
      bolt.setYaw(angle + Math.PI);
      bolt.setHeight(60);
      bolts.push(bolt);
      pierced.push(new Set<number>());
    }
    const dummy = Unit.create(owner, this.dummyUnitId, cx, cy);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    const at = Point.create(cx, cy);
    let radius = 450;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      radius -= 30;
      for (let i = 0; i < bolts.length; i++) {
        const angle = (i * Math.PI) / 6;
        const bx = cx + radius * Math.cos(angle);
        const by = cy + radius * Math.sin(angle);
        bolts[i].x = bx;
        bolts[i].y = by;
        at.setPosition(bx, by);
        const grp = Group.fromRange(60, at);
        grp.for((u) => {
          if (!this.isVictim(u, owner)) return;
          if (pierced[i].has(u.id)) return;

          pierced[i].add(u.id);
          this.curse(u);
          dummy.damageTarget(
            u.handle,
            10,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        });
        grp.destroy();
      }
      if (radius > 30) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      for (const bolt of bolts) bolt.destroy();
      this.burst(owner, dummy, cx, cy);
    });
  }

  private burst(owner: MapPlayer, dummy: Unit, x: number, y: number): void {
    Effect.create(
      "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
      x,
      y,
    ).destroy();
    let nearest: Unit | undefined;
    let nearestDistance = 0;
    const grp = Group.fromRange(250, dummy.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      const curses = u.getAbilityLevel(this.curseAbilityId);
      dummy.damageTarget(
        u.handle,
        40 * (1 + 0.2 * curses),
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (nearest != null && distance >= nearestDistance) return;
      nearest = u;
      nearestDistance = distance;
    });
    grp.destroy();
    // The nova's own chill, from the enemy nearest the middle
    if (nearest?.isAlive()) {
      dummy.addAbility(this.frostNovaAbilityId);
      dummy.issueTargetOrder(OrderId.Frostnova, nearest);
    }
  }

  private curse(u: Unit): void {
    const level = u.getAbilityLevel(this.curseAbilityId);
    if (level === 0) u.addAbility(this.curseAbilityId);
    else if (level < 10) u.setAbilityLevel(this.curseAbilityId, level + 1);
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    return true;
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(800, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      candidates.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let bestCount = 0;
    for (const candidate of candidates) {
      let count = 0;
      for (const other of candidates) {
        const dx = other.x - candidate.x;
        const dy = other.y - candidate.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= bestCount) continue;
      best = candidate;
      bestCount = count;
    }
    return best;
  }
}
