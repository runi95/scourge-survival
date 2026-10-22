import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Skeleton Warriors claw their way out of the ground beneath the 2 enemies
// nearest the hero, driving spikes up through them and on away from the
// hero, then stay to fight
export class Uprising extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0A4");
  public readonly merchantItemTypeId = FourCC("I0A5");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemSkeletons = new Map<number, Unit[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly skeletonUnitTypeId: number = FourCC("u01A");
  private readonly impaleAbilityId: number = FourCC("A00A");

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
      const enemies: Unit[] = [];
      const grp = Group.fromRange(500, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();
      // The nearest, then the nearest at least 150 away from it
      const risen: Unit[] = [];
      for (let i = 0; i < 2; i++) {
        let nearest: Unit | undefined;
        let nearestDistance = 0;
        for (const enemy of enemies) {
          if (
            risen.some(
              (r) =>
                (r.x - enemy.x) * (r.x - enemy.x) +
                  (r.y - enemy.y) * (r.y - enemy.y) <
                150 * 150,
            )
          )
            continue;
          const distance =
            (enemy.x - x) * (enemy.x - x) + (enemy.y - y) * (enemy.y - y);
          if (nearest != null && distance >= nearestDistance) continue;
          nearest = enemy;
          nearestDistance = distance;
        }
        if (nearest == null) break;
        risen.push(nearest);
      }

      const skeletons = (this.itemSkeletons.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      for (const enemy of risen) {
        skeletons.push(this.rise(owner, x, y, enemy));
      }
      this.itemSkeletons.set(itemId, skeletons);
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

    const skeletons = this.itemSkeletons.get(itemId);
    this.itemSkeletons.delete(itemId);
    if (skeletons == null) return;
    for (const skeleton of skeletons) {
      if (skeleton.isAlive()) skeleton.kill();
    }
  }

  // The spikes start just in front of the enemy and run on away from the
  // hero at (hx, hy)
  private rise(owner: MapPlayer, hx: number, hy: number, enemy: Unit): Unit {
    const { x, y } = enemy;
    const angle = Math.atan2(y - hy, x - hx);
    const dummy = Unit.create(
      owner,
      this.dummyUnitId,
      x - 50 * Math.cos(angle),
      y - 50 * Math.sin(angle),
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    dummy.addAbility(this.impaleAbilityId);
    dummy.issueOrderAt(
      "impale",
      x + 100 * Math.cos(angle),
      y + 100 * Math.sin(angle),
    );

    Effect.create(
      "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
      x,
      y,
    ).destroy();
    const skeleton = Unit.create(owner, this.skeletonUnitTypeId, x, y);
    skeleton.facing = (angle * 180) / Math.PI;
    skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 12);
    skeleton.setAnimation("birth");
    skeleton.queueAnimation("stand");
    return skeleton;
  }
}
