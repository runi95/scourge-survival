import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class Marksman extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I02V");
  public readonly merchantItemTypeId = FourCC("I02W");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I00Y")];

  private readonly timers = new Map<number, Timer>();
  private readonly flareUnitTypeId: number = FourCC("u00Y");

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
      const target = this.farthestEnemy(vehicle.unit, owner);
      if (target == null) return;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      Effect.createAttachment(
        "Abilities/Spells/Human/Flare/FlareCaster.mdl",
        vehicle.unit,
        "overhead",
      ).destroy();

      const { x, y } = target;
      const flare = Unit.create(owner, this.flareUnitTypeId, x, y);
      flare.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);

      let ticks = 0;
      const burnTimer = TimerUtils.newTimer();
      burnTimer.start(1, true, () => {
        ticks++;
        this.burn(vehicle.unit, owner, x, y);
        if (ticks >= 4) TimerUtils.releaseTimer(burnTimer);
      });
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

  private burn(source: Unit, owner: MapPlayer, x: number, y: number): void {
    const loc = Point.create(x, y);
    const grp = Group.fromRange(200, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      source.damageTarget(
        u.handle,
        10,
        false,
        false,
        ATTACK_TYPE_MAGIC,
        DAMAGE_TYPE_FIRE,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    loc.destroy();
  }

  private farthestEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const { x, y } = source;
    let farthest: Unit | undefined;
    let farthestDistance = -1;
    const grp = Group.fromRange(1500, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const distance = Math.pow(u.x - x, 2) + Math.pow(u.y - y, 2);
      if (distance > farthestDistance) {
        farthest = u;
        farthestDistance = distance;
      }
    });
    grp.destroy();

    return farthest;
  }
}
