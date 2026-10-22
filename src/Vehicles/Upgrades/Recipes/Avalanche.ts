import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// A ball of ice rolls in from beyond the largest group, through it and past
// the hero. Every enemy ground unit it rolls over is chilled and makes it
// bigger, and at the end it bursts in a Frost Nova that hurts more the
// bigger it grew
export class Avalanche extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0AI");
  public readonly merchantItemTypeId = FourCC("I0AJ");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chillAbilityId: number = FourCC("A04X");
  private readonly frostNovaAbilityId: number = FourCC("A03B");

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

      const target = this.largestGroup(vehicle.unit, owner);
      if (target == null) return;

      // From 200 beyond it, through it, past the hero to 300 behind it
      const { x, y } = vehicle.unit;
      const angle = Math.atan2(target.y - y, target.x - x);
      const distance =
        Math.sqrt(
          (target.x - x) * (target.x - x) + (target.y - y) * (target.y - y),
        ) + 200;
      this.roll(
        owner,
        x + distance * Math.cos(angle),
        y + distance * Math.sin(angle),
        angle + Math.PI,
        distance + 300,
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

  // 30 every 0.05 seconds; it catches what is within 100 of it, 15 more for
  // every enemy in it
  private roll(
    owner: MapPlayer,
    x: number,
    y: number,
    angle: number,
    distance: number,
  ): void {
    const ball = Effect.create(
      "Abilities/Weapons/FrostWyrmMissile/FrostWyrmMissile.mdl",
      x,
      y,
    );
    ball.setYaw(angle);
    ball.setHeight(40);
    ball.scale = 0.8;
    const at = Point.create(x, y);
    const caught = new Set<number>();
    let rolled = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      rolled += 30;
      x += 30 * Math.cos(angle);
      y += 30 * Math.sin(angle);
      ball.x = x;
      ball.y = y;
      at.setPosition(x, y);
      const grp = Group.fromRange(100 + 15 * caught.size, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;
        if (caught.has(u.id)) return;

        caught.add(u.id);
        const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.addAbility(this.chillAbilityId);
        dummy.setAbilityLevel(this.chillAbilityId, 3);
        dummy.issueTargetOrder("slow", u);
        dummy.damageTarget(
          u.handle,
          75,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
      ball.scale = 0.8 + 0.15 * Math.min(caught.size, 10);
      if (rolled < distance) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      ball.destroy();
      this.burst(owner, x, y, Math.min(caught.size, 10));
    });
  }

  private burst(owner: MapPlayer, x: number, y: number, size: number): void {
    Effect.create(
      "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
      x,
      y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.frostNovaAbilityId);
    let novaTarget: Unit | undefined;
    const grp = Group.fromRange(150 + 15 * size, dummy.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      novaTarget ??= u;
      dummy.damageTarget(
        u.handle,
        50 + 25 * size,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    // The nova's own blast and chill, on whatever is left at the end
    if (novaTarget?.isAlive()) dummy.issueTargetOrder("frostnova", novaTarget);
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(800, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

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
