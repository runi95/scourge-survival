import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class Whirlpool extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I01O");
  public readonly merchantItemTypeId = FourCC("I01P");
  public readonly recipe: number[] = [FourCC("I00M"), FourCC("I00X")];

  private readonly timers = new Map<number, Timer>();
  private readonly geyserTimers = new Map<number, Timer>();
  private readonly whirlpoolUnitTypeId: number = FourCC("n008");
  private readonly itemWhirlpoolMap = new Map<number, Unit>();

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
      this.spawnWhirlpool(vehicle, owner, itemId, weaponIndex);
    });

    this.spawnWhirlpool(vehicle, owner, itemId, weaponIndex);
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
    this.stopGeysers(itemId);

    const whirlpool = this.itemWhirlpoolMap.get(itemId);
    if (whirlpool == null) return;

    this.itemWhirlpoolMap.delete(itemId);
    whirlpool.kill();
  }

  private spawnWhirlpool(
    vehicle: Vehicle,
    owner: MapPlayer,
    itemId: number,
    weaponIndex: number,
  ) {
    const { x, y } = vehicle.unit;
    const whirlpool = Unit.create(owner, this.whirlpoolUnitTypeId, x, y);
    whirlpool.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, this.cooldown);
    whirlpool.setAnimation("birth");
    whirlpool.queueAnimation("stand");
    this.itemWhirlpoolMap.set(itemId, whirlpool);

    // The previous whirlpool has expired by now, so its geysers stop with it
    this.stopGeysers(itemId);
    const geyserTimer = TimerUtils.newTimer();
    this.geyserTimers.set(itemId, geyserTimer);
    geyserTimer.start(1, true, () => {
      if (!whirlpool.isAlive()) {
        this.stopGeysers(itemId);
        return;
      }

      this.eruptGeyser(whirlpool, owner);
    });

    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );
  }

  private eruptGeyser(whirlpool: Unit, owner: MapPlayer): void {
    const enemies: Unit[] = [];
    const grp: Group = Group.fromRange(500, whirlpool.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;

      enemies.push(u);
    });
    grp.destroy();

    if (enemies.length === 0) return;

    const target = enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
    Effect.create(
      "Objects/Spawnmodels/Naga/NagaDeath/NagaDeath.mdl",
      target.x,
      target.y,
    ).destroy();
    whirlpool.damageTarget(
      target.handle,
      150,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
  }

  private stopGeysers(itemId: number): void {
    const geyserTimer = this.geyserTimers.get(itemId);
    if (geyserTimer == null) return;

    this.geyserTimers.delete(itemId);
    TimerUtils.releaseTimer(geyserTimer);
  }
}
