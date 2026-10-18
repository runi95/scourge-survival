import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { RuptureDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/RuptureDamageEvent";

// Impales towards a random enemy; RuptureDamageEvent cripples what the spikes
// hit, or ruptures an already crippled enemy and sends the spikes on from it
export class Rupture extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I04Y");
  public readonly merchantItemTypeId = FourCC("I04Z");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly crippleBuffId: number = FourCC("Bcri");

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
      // Crippled enemies the spikes reach first, then any they reach, else
      // towards the nearest one further out
      const { x, y } = vehicle.unit;
      const crippled: Unit[] = [];
      const enemies: Unit[] = [];
      let nearest: Unit | undefined;
      let nearestDistance = 0;
      const grp = Group.fromRange(900, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (distance <= 450 * 450) {
          if (u.getAbilityLevel(this.crippleBuffId) > 0) crippled.push(u);
          else enemies.push(u);
        }
        if (nearest != null && distance >= nearestDistance) return;
        nearest = u;
        nearestDistance = distance;
      });
      grp.destroy();
      if (enemies.length === 0 && nearest != null) enemies.push(nearest);
      const options = crippled.length > 0 ? crippled : enemies;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (options.length === 0) return;

      const target =
        options[RandomNumberGenerator.random(0, options.length - 1)];
      RuptureDamageEvent.impale(owner, x, y, target.x, target.y, 0);
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
