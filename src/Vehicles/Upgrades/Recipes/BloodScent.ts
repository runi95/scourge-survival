import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { BloodScentDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BloodScentDamageEvent";

const MULT = Math.PI / 180;

interface Pack {
  wolves: Unit[];
  // What each wolf was last sent after
  prey: Map<Unit, Unit>;
  timers: Timer[];
}

// Every 2.5 seconds a boulder (u01P: 58 - 60, 150 splash) at a random enemy
// ground unit within 800; every enemy it hurts bleeds for 5 s
// (BloodScentDamageEvent). Every 30 seconds 2 wolves (o004: 46 - 47, 15% x2
// crit, 25 s), sent every 0.5 s after the nearest bleeding enemy within 900
// of them; their bites on bleeding enemies are doubled
export class BloodScent extends WeaponUpgradeRecipe {
  public readonly cooldown = 30;
  public readonly itemTypeId = FourCC("I08G");
  public readonly merchantItemTypeId = FourCC("I08H");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I05I")];

  private readonly packs = new Map<number, Pack>();
  private readonly boulderUnitId: number = FourCC("u01P");
  private readonly wolfUnitId: number = FourCC("o004");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pack: Pack = { wolves: [], prey: new Map(), timers: [] };
    this.packs.set(itemId, pack);

    const boulders = TimerUtils.newTimer();
    boulders.start(2.5, true, () => {
      const hero = vehicle.unit;
      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, hero.point);
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

      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const boulder = Unit.create(owner, this.boulderUnitId, hero.x, hero.y);
      boulder.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      const id = boulder.id;
      BloodScentDamageEvent.BOULDERS.add(id);
      boulder.issueTargetOrder("attack", target);

      const forget = TimerUtils.newTimer();
      forget.start(3, false, () => {
        TimerUtils.releaseTimer(forget);
        BloodScentDamageEvent.BOULDERS.delete(id);
      });
    });

    const summon = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = hero.x + 150 * Math.cos(radians);
        const wy = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const wolf = Unit.create(owner, this.wolfUnitId, wx, wy);
        wolf.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 25);
        pack.wolves.push(wolf);
        BloodScentDamageEvent.WOLVES.add(wolf.id);
      }
    };
    const wolves = TimerUtils.newTimer();
    wolves.start(this.cooldown, true, summon);

    const hunt = TimerUtils.newTimer();
    hunt.start(0.5, true, () => {
      for (let i = pack.wolves.length - 1; i >= 0; i--) {
        const wolf = pack.wolves[i];
        if (!wolf.isAlive()) {
          BloodScentDamageEvent.WOLVES.delete(wolf.id);
          pack.prey.delete(wolf);
          pack.wolves.splice(i, 1);
          continue;
        }
        const prey = this.nearestBleeding(wolf, owner);
        if (prey == null || pack.prey.get(wolf) === prey) continue;
        pack.prey.set(wolf, prey);
        wolf.issueTargetOrder("attack", prey);
      }
    });
    pack.timers.push(boulders, wolves, hunt);
    summon();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const pack = this.packs.get(itemId);
    this.packs.delete(itemId);
    if (pack == null) return;
    for (const t of pack.timers) TimerUtils.releaseTimer(t);
    pack.timers.length = 0;
    for (const wolf of pack.wolves) {
      BloodScentDamageEvent.WOLVES.delete(wolf.id);
      if (wolf.isAlive()) wolf.kill();
    }
    pack.wolves.length = 0;
    pack.prey.clear();
  }

  // The bleeding enemy nearest to the wolf within 900
  private nearestBleeding(wolf: Unit, owner: MapPlayer): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDist = 0;
    const grp = Group.fromRange(900, wolf.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (!BloodScentDamageEvent.BLEEDING.has(u.id)) return;

      const d =
        (u.x - wolf.x) * (u.x - wolf.x) + (u.y - wolf.y) * (u.y - wolf.y);
      if (nearest == null || d < nearestDist) {
        nearest = u;
        nearestDist = d;
      }
    });
    grp.destroy();
    return nearest;
  }
}
