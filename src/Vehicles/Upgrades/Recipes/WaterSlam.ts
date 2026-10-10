import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class WaterSlam extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I06E");
  public readonly merchantItemTypeId = FourCC("I06F");
  public readonly recipe: number[] = [FourCC("I00M"), FourCC("I05C")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A03Z");
  private readonly unitTypeId: number = FourCC("h002");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();

      if (enemies.length === 0) return;

      const hx = vehicle.unit.x;
      const hy = vehicle.unit.y;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      {
        const dummy = Unit.create(owner, this.dummyUnitId, target.x, target.y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.addAbility(this.abilityId);
        dummy.issueImmediateOrder("thunderclap");
      }
      Effect.create(
        "Abilities/Spells/Other/CrushingWave/CrushingWaveDamage.mdl",
        target.x,
        target.y,
      ).destroy();
      for (let i = 0; i < 1; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const sx = target.x + 50 * Math.cos(radians);
        const sy = target.y + 50 * Math.sin(radians);
        const summoned = Unit.create(owner, this.unitTypeId, sx, sy);
        summoned.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 8);
        summoned.setAnimation("birth");
        summoned.queueAnimation("stand");
      }
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, tick);
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
}
