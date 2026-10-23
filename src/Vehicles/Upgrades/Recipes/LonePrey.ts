import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Every second the hero shoots a poisoned arrow at the most isolated enemy
// within 800, the one with the fewest other enemies within 300 of it. The
// poison (50 + 30 every 3s for 9s, -50% move fading) makes it fall behind its
// pack. An enemy with no other enemy within 300 is lone prey: 200 instead.
export class LonePrey extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I0DK");
  public readonly merchantItemTypeId = FourCC("I0DL");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I05Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly arrowAbilityId: number = FourCC("A05B");
  private readonly heartAbilityId: number = FourCC("A05C");

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
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (this.isVictim(u, owner)) enemies.push(u);
      });
      grp.destroy();
      if (enemies.length === 0) return;

      // Fewest other enemies within 300 (counted over everything near it,
      // not only those within the hero's range); ties go to the nearest
      let target: Unit | undefined;
      let fewest = 0;
      let nearest = 0;
      for (const u of enemies) {
        let friends = 0;
        const near = Group.fromRange(300, u.point);
        near.for((o) => {
          if (o !== u && this.isVictim(o, owner)) friends++;
        });
        near.destroy();
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        const d = dx * dx + dy * dy;
        if (
          target == null ||
          friends < fewest ||
          (friends === fewest && d < nearest)
        ) {
          target = u;
          fewest = friends;
          nearest = d;
        }
      }

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
      dummy.addAbility(
        fewest === 0 ? this.heartAbilityId : this.arrowAbilityId,
      );
      dummy.issueTargetOrder("shadowstrike", target);
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

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    return (
      u.isAlive() &&
      u.isVisible(owner) &&
      u.isEnemy(owner) &&
      !u.isUnitType(UNIT_TYPE_STRUCTURE)
    );
  }
}
