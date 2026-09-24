import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class TeslaCoil extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I01Q");
  public readonly merchantItemTypeId = FourCC("I01R");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly teslaCoilUnitTypeId: number = FourCC("n009");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chainLightningAbilityId: number = FourCC("A029");
  private readonly itemIterations = new Map<number, number>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    // Keep counting from where we were so dropping the item can't reset the cooldown
    const existingIterations = this.itemIterations.get(itemId);
    if (existingIterations == null) {
      this.itemIterations.set(itemId, 30);
    } else {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        2 * (30 - existingIterations),
      );
    }

    t.start(2, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations < 29) {
        this.itemIterations.set(itemId, iterations + 1);
        return;
      }

      this.itemIterations.set(itemId, 0);

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      this.spawnTeslaCoil(
        owner,
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
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

  private spawnTeslaCoil(owner: MapPlayer, x: number, y: number): void {
    const teslaCoil = Unit.create(owner, this.teslaCoilUnitTypeId, x, y);
    teslaCoil.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 60);

    // Like the Pocket Factory, the coil outlives the item being dropped
    const zapTimer = TimerUtils.newTimer();
    zapTimer.start(3, true, () => {
      if (!teslaCoil.isAlive()) {
        TimerUtils.releaseTimer(zapTimer);
        return;
      }

      this.zap(teslaCoil, owner);
    });
  }

  private zap(teslaCoil: Unit, owner: MapPlayer): void {
    const grp: Group = Group.fromRange(500, teslaCoil.point);
    let hasStruck = false;
    grp.for((u) => {
      if (hasStruck) return;
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      hasStruck = true;

      const dummy = Unit.create(
        owner,
        this.dummyUnitId,
        teslaCoil.x,
        teslaCoil.y,
      );
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.setflyHeight(180, 0);
      dummy.addAbility(this.chainLightningAbilityId);
      dummy.issueTargetOrder("chainlightning", u);
    });
    grp.destroy();
  }
}
