import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Stake {
  unit: Unit;
  boulders: number;
  // Seconds until it can call a boulder again
  reload: number;
}

interface Zone {
  stakes: Stake[];
  timers: Timer[];
}

// Every 4 seconds a stake (n01T, 40 s) under the hero, up to 4 (the oldest
// goes). An enemy ground unit within 250 of a stake calls a boulder onto it
// (0.4 s fall, 60 to every enemy ground unit within 250), at most one every
// 2.5 s; a stake is spent after 2
export class KillZone extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I08K");
  public readonly merchantItemTypeId = FourCC("I08L");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I003")];

  private readonly zones = new Map<number, Zone>();
  private readonly stakeUnitId: number = FourCC("n01T");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const zone: Zone = { stakes: [], timers: [] };
    this.zones.set(itemId, zone);

    const plant = TimerUtils.newTimer();
    plant.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (zone.stakes.length >= 4) this.spend(zone, zone.stakes[0]);
      const unit = Unit.create(owner, this.stakeUnitId, hero.x, hero.y, 270);
      unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 40);
      zone.stakes.push({ unit, boulders: 2, reload: 0 });
    });

    const watch = TimerUtils.newTimer();
    watch.start(0.25, true, () => {
      for (let i = zone.stakes.length - 1; i >= 0; i--) {
        const stake = zone.stakes[i];
        if (!stake.unit.isAlive()) {
          zone.stakes.splice(i, 1);
          continue;
        }
        stake.reload -= 0.25;
        if (stake.reload > 0) continue;
        const { x, y } = stake.unit;
        if (this.enemies(x, y, 250, owner).length === 0) continue;

        stake.reload = 2.5;
        stake.boulders--;
        this.drop(vehicle.unit, owner, x, y);
        if (stake.boulders <= 0) this.spend(zone, stake);
      }
    });
    zone.timers.push(plant, watch);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const zone = this.zones.get(itemId);
    this.zones.delete(itemId);
    if (zone == null) return;
    for (const t of zone.timers) TimerUtils.releaseTimer(t);
    zone.timers.length = 0;
    while (zone.stakes.length > 0) this.spend(zone, zone.stakes[0]);
  }

  private spend(zone: Zone, stake: Stake) {
    const i = zone.stakes.indexOf(stake);
    if (i >= 0) zone.stakes.splice(i, 1);
    if (stake.unit.isAlive()) stake.unit.kill();
  }

  // A boulder falls onto the stake
  private drop(hero: Unit, owner: MapPlayer, x: number, y: number) {
    const fall = Effect.create(
      "Abilities/Weapons/DemolisherMissile/DemolisherMissile.mdl",
      x,
      y,
    );
    fall.scale = 1.5;
    let height = 800;
    fall.setHeight(height);

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      height -= 100;
      if (height > 0) {
        fall.setHeight(height);
        return;
      }
      TimerUtils.releaseTimer(t);
      fall.destroy();
      for (const u of this.enemies(x, y, 250, owner)) {
        hero.damageTarget(
          u.handle,
          60,
          false,
          false,
          ATTACK_TYPE_SIEGE,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
    });
  }

  private enemies(x: number, y: number, range: number, owner: MapPlayer) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }
}
