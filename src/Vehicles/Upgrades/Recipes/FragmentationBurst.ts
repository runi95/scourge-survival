import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

const MULT = Math.PI / 180;

export class FragmentationBurst extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I020");
  public readonly merchantItemTypeId = FourCC("I021");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I002")];

  private readonly timers = new Map<number, Timer>();

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
      const baseAngle = RandomNumberGenerator.random(0, 359);
      const rockets: Effect[] = [];
      for (let i = 0; i < 8; i++) {
        const rocket = Effect.create(
          "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
          x,
          y,
        );
        rocket.setYaw((baseAngle + i * 45) * MULT);
        rockets.push(rocket);
      }

      const ground = Point.create(x, y);
      let elapsed = 0;
      const t = TimerUtils.newTimer();
      t.start(0.03125, true, () => {
        elapsed += 0.03125;
        const progress = Math.min(1, elapsed / 0.4);
        const distance = 500 * progress;
        const height = 50 + 120 * progress * (1 - progress);

        for (let i = 0; i < 8; i++) {
          const radians = (baseAngle + i * 45) * MULT;
          const rx = x + distance * Math.cos(radians);
          const ry = y + distance * Math.sin(radians);
          ground.setPosition(rx, ry);
          rockets[i].setPosition(rx, ry, ground.z + height);
        }

        if (progress < 1) return;

        TimerUtils.releaseTimer(t);
        ground.destroy();
        for (let i = 0; i < 8; i++) {
          const radians = (baseAngle + i * 45) * MULT;
          rockets[i].destroy();
          this.explode(
            vehicle.unit,
            owner,
            x + 500 * Math.cos(radians),
            y + 500 * Math.sin(radians),
          );
        }
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

  private explode(dummy: Unit, owner: MapPlayer, x: number, y: number): void {
    const loc = Point.create(x, y);
    const grp = Group.fromRange(175, loc);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      dummy.damageTarget(
        u.handle,
        45,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) StunUtils.stunUnit(u.handle, 0.5);
    });
    grp.destroy();
    loc.destroy();
  }
}
