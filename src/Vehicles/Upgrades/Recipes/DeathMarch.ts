import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Skeleton Warriors rise in a row and charge like a swarm towards the largest
// group, trampling every enemy in their path, then stay to fight
export class DeathMarch extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I09W");
  public readonly merchantItemTypeId = FourCC("I09X");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemSkeletons = new Map<number, Unit[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly skeletonUnitTypeId: number = FourCC("u01A");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const march = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const target = this.largestGroup(vehicle.unit, owner);
      const angle =
        target != null
          ? Math.atan2(target.y - y, target.x - x)
          : (vehicle.unit.facing * Math.PI) / 180;

      // Earlier skeletons can still be up
      const skeletons = (this.itemSkeletons.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      const charging: Unit[] = [];
      for (let i = -1; i <= 1; i++) {
        const sx = x + 90 * i * Math.cos(angle + Math.PI / 2);
        const sy = y + 90 * i * Math.sin(angle + Math.PI / 2);
        Effect.create(
          "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
          sx,
          sy,
        ).destroy();
        const skeleton = Unit.create(
          owner,
          this.skeletonUnitTypeId,
          sx,
          sy,
          (angle * 180) / Math.PI,
        );
        skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
        skeleton.setAnimation("walk");
        charging.push(skeleton);
        skeletons.push(skeleton);
      }
      this.itemSkeletons.set(itemId, skeletons);
      this.charge(owner, charging, angle);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, march);
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

    const skeletons = this.itemSkeletons.get(itemId);
    this.itemSkeletons.delete(itemId);
    if (skeletons == null) return;
    for (const skeleton of skeletons) {
      if (skeleton.isAlive()) skeleton.kill();
    }
  }

  // 800 in 1 second; every enemy a skeleton runs into is trampled once
  private charge(owner: MapPlayer, skeletons: Unit[], angle: number): void {
    const dummy = Unit.create(
      owner,
      this.dummyUnitId,
      skeletons[0].x,
      skeletons[0].y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    const at = Point.create(0, 0);
    const trampled = new Set<number>();
    const dx = 800 * 0.03 * Math.cos(angle);
    const dy = 800 * 0.03 * Math.sin(angle);
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      elapsed += 0.03;
      for (const skeleton of skeletons) {
        if (!skeleton.isAlive()) continue;
        skeleton.x = skeleton.x + dx;
        skeleton.y = skeleton.y + dy;
        at.setPosition(skeleton.x, skeleton.y);
        const grp = Group.fromRange(100, at);
        grp.for((u) => {
          if (trampled.has(u.id)) return;
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
          if (u.isUnitType(UNIT_TYPE_FLYING)) return;

          trampled.add(u.id);
          dummy.damageTarget(
            u.handle,
            100,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_NORMAL,
            WEAPON_TYPE_WHOKNOWS,
          );
        });
        grp.destroy();
      }
      if (elapsed < 1) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      for (const skeleton of skeletons) {
        if (skeleton.isAlive()) skeleton.setAnimation("stand");
      }
    });
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
        const distance = Math.sqrt(
          Math.pow(other.x - candidate.x, 2) +
            Math.pow(other.y - candidate.y, 2),
        );
        if (distance <= 250) count++;
      }

      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  }
}
