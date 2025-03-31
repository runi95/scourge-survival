import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { WeaponUpgrade } from "../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { Group } from "../../../Utility/Group";

export class ChainLightning extends WeaponUpgrade {
  public readonly name = "Chain Lightning";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNChainLightning.blp";
  public readonly cost = 500;
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I00Q");
  public readonly description = (
    level: number
  ) => `Calls a chain lightning every so often that hits any nearby enemy units.

Damage: |cffffcc00180|r
Damage reduction (jump): |cffffcc00-15%|r
Cooldown: |cffffcc002s|r
Range: |cffffcc00500|r
Area of Effect (chain): |cffffcc00500|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chainLightningAbilityId: number = FourCC("A000");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    const playerId = owner.id;

    t.start(2, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const { point } = vehicle.unit;
      const grp = Group.fromRange(500, point);
      let hasStruck = false;

      grp.for((u) => {
        if (hasStruck) return;
        if (!u.isAlive()) return;
        if (u.owner.id !== playerId + 9) return;
        if (!u.isVisible(owner)) return;
        hasStruck = true;

        const { x, y } = vehicle.unit;
        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
        dummy.addAbility(this.chainLightningAbilityId);
        dummy.issueTargetOrder("chainlightning", u);
      });
      grp.destroy();
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
  }
}
