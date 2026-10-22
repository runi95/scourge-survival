import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Cripples the farthest enemy and sends spikes burrowing after it. They
// curve to follow it, impaling every enemy on their way, and erupt under it
// once they catch up
export class NerubianAmbush extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I04Y");
  public readonly merchantItemTypeId = FourCC("I04Z");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");
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
      let prey: Unit | undefined;
      let preyDistance = 0;
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (prey != null && distance <= preyDistance) return;
        prey = u;
        preyDistance = distance;
      });
      grp.destroy();
      if (prey == null) return;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.crippleAbilityId);
      dummy.issueTargetOrder(OrderId.Cripple, prey);
      this.burrow(owner, x, y, prey);
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

  // The spikes' head moves 60 every 0.1 seconds towards where the prey is
  // now, for at most 2 seconds
  private burrow(owner: MapPlayer, x: number, y: number, prey: Unit): void {
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    const at = Point.create(x, y);
    const impaled = new Set<number>([prey.id]);
    let tx = prey.x;
    let ty = prey.y;
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      elapsed += 0.1;
      if (prey.isAlive()) {
        tx = prey.x;
        ty = prey.y;
      }
      const angle = Math.atan2(ty - y, tx - x);
      const left = Math.sqrt((tx - x) * (tx - x) + (ty - y) * (ty - y));
      if (left > 60 && elapsed < 2) {
        x += 60 * Math.cos(angle);
        y += 60 * Math.sin(angle);
        Effect.create(
          "Abilities/Spells/Undead/Impale/ImpaleMissTarget.mdl",
          x,
          y,
        ).destroy();
        at.setPosition(x, y);
        const grp = Group.fromRange(110, at);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
          if (u.isUnitType(UNIT_TYPE_FLYING)) return;
          if (impaled.has(u.id)) return;

          impaled.add(u.id);
          dummy.damageTarget(
            u.handle,
            80,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        });
        grp.destroy();
        return;
      }

      TimerUtils.releaseTimer(t);
      at.destroy();
      // They erupt under the prey, tossing it and what stands behind it
      dummy.setPosition(x - 100 * Math.cos(angle), y - 100 * Math.sin(angle));
      dummy.addAbility(this.impaleAbilityId);
      dummy.issueOrderAt(
        "impale",
        x + 100 * Math.cos(angle),
        y + 100 * Math.sin(angle),
      );
      if (prey.isAlive() && left <= 150) {
        dummy.damageTarget(
          prey.handle,
          200,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
    });
  }
}
