import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

export class ScatterMines extends WeaponUpgradeRecipe {
  public readonly cooldown = 7;
  public readonly itemTypeId = FourCC("I01W");
  public readonly merchantItemTypeId = FourCC("I01X");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly scatterMineUnitTypeId: number = FourCC("n00G");

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
      for (let i = 0; i < 6; i++) {
        const angle =
          baseAngle + (i * 360) / 6 + RandomNumberGenerator.random(-20, 20);
        const distance = RandomNumberGenerator.random(200, 500);

        let targetX = x;
        let targetY = y;
        for (let d = distance; d > 0; d -= 50) {
          const tx = x + d * Math.cos(angle);
          const ty = y + d * Math.sin(angle);
          if (!IsTerrainPathable(tx, ty, PATHING_TYPE_WALKABILITY)) {
            targetX = tx;
            targetY = ty;
            break;
          }
        }

        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspiritdone.mdl",
          targetX,
          targetY,
        ).destroy();

        const mine = Unit.create(
          owner,
          this.scatterMineUnitTypeId,
          targetX,
          targetY,
        );
        mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);
      }
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
}
