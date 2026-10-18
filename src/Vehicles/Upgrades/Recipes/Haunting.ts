import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

// A flock of spirits settles over the largest group and haunts it for 4
// seconds, following it around and striking a random enemy in it 5 times a
// second
export class Haunting extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0C4");
  public readonly merchantItemTypeId = FourCC("I0C5");
  public readonly recipe: number[] = [FourCC("I02K"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");

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

      const anchor = this.largestGroup(vehicle.unit, owner);
      if (anchor != null) this.haunt(owner, anchor);
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

  private haunt(owner: MapPlayer, anchor: Unit): void {
    let { x, y } = anchor;
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 5);
    const spirits: Effect[] = [];
    for (let i = 0; i < 5; i++) {
      const spirit = Effect.create(
        "Abilities/Weapons/ZigguratMissile/ZigguratMissile.mdl",
        x,
        y,
      );
      spirit.setHeight(150);
      spirits.push(spirit);
    }

    const at = Point.create(x, y);
    let elapsed = 0;
    let strikes = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      elapsed += 0.05;
      // It follows the group while the enemy it settled on lives
      if (anchor.isAlive()) {
        x = anchor.x;
        y = anchor.y;
      }
      for (let i = 0; i < spirits.length; i++) {
        const angle = elapsed * 4 + (i * 2 * Math.PI) / spirits.length;
        spirits[i].x = x + 150 * Math.cos(angle);
        spirits[i].y = y + 150 * Math.sin(angle);
      }

      if (elapsed >= 0.2 * (strikes + 1)) {
        strikes++;
        at.setPosition(x, y);
        const haunted: Unit[] = [];
        const grp = Group.fromRange(250, at);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

          haunted.push(u);
        });
        grp.destroy();
        if (haunted.length > 0) {
          const victim =
            haunted[RandomNumberGenerator.random(0, haunted.length - 1)];
          Effect.createAttachment(
            "Abilities/Weapons/ZigguratMissile/ZigguratMissile.mdl",
            victim,
            "chest",
          ).destroy();
          dummy.damageTarget(
            victim.handle,
            45,
            false,
            false,
            ATTACK_TYPE_PIERCE,
            DAMAGE_TYPE_NORMAL,
            WEAPON_TYPE_WHOKNOWS,
          );
        }
      }
      if (elapsed < 4) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      for (const spirit of spirits) spirit.destroy();
    });
  }

  private largestGroup(source: Unit, owner: MapPlayer): Unit | undefined {
    const candidates: Unit[] = [];
    const grp = Group.fromRange(700, source.point);
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
