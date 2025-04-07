import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class ExplosiveElemental extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I011");
  public readonly merchantItemTypeId = FourCC("I012");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I00M")];

  private readonly timers = new Map<number, Timer>();
  private readonly waterElementalUnitTypeId: number = FourCC("h003");
  private readonly itemWaterElementalMap = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();
  private readonly onDeathTrigger = Trigger.create();

  constructor() {
    super();

    this.onDeathTrigger.addAction(() => {
      const dyingUnit = GetDyingUnit();
      const typeId = GetUnitTypeId(dyingUnit);
      if (typeId !== this.waterElementalUnitTypeId) return;

      DestroyEffect(
        AddSpecialEffectTarget(
          "Abilities/Spells/Other/Incinerate/FireLordDeathExplode.mdl",
          dyingUnit,
          "origin"
        )
      );
    });
    this.onDeathTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    this.itemIterations.set(itemId, 0);
    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations === 0) {
        const { x, y } = vehicle.unit;
        const randomAngle = RandomNumberGenerator.random(0, 359);
        const radian = randomAngle * MULT;
        const waterElemental = Unit.create(
          owner,
          this.waterElementalUnitTypeId,
          x + 300 * Math.cos(radian),
          y + 300 * Math.sin(radian)
        );
        waterElemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
        waterElemental.setAnimation("birth");
        waterElemental.queueAnimation("stand");
        this.itemWaterElementalMap.set(itemId, waterElemental);

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown
        );
      }

      this.itemIterations.set(itemId, iterations + 1);
      if (iterations === 6) {
        this.itemWaterElementalMap.delete(itemId);
        return;
      } else if (iterations >= 7) {
        this.itemIterations.set(itemId, 0);
      }
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
    this.itemIterations.delete(itemId);

    const waterElemental = this.itemWaterElementalMap.get(itemId);
    if (waterElemental == null) return;

    waterElemental.destroy();
  }
}
