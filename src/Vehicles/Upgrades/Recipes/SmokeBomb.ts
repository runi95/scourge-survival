import { Effect, FogModifier, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { GameMap } from "../../../Game/GameMap";

type Cloud = {
  anchor: Unit;
  sight: FogModifier;
  at: Point;
  effects: Effect[];
  age: number;
  // Enemies groping their way out, and every enemy already stabbed
  inside: Set<Unit>;
  stabbed: Set<Unit>;
};

// Every 5 seconds the hero drops a goblin smoke bomb under itself. The smoke
// (300 around where it fell) hangs there for 4s. An enemy inside loses the
// hero and stumbles blindly out of the cloud, unable to fight on the way, and
// as it comes out a poisoned dagger finds it from inside the smoke (Shadow
// Strike: 200 + 30 every 3s for 9s, -50% movement speed), once per enemy and
// cloud
export class SmokeBomb extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I0E4");
  public readonly merchantItemTypeId = FourCC("I0E5");
  public readonly recipe: number[] = [FourCC("I05Q"), FourCC("I003")];

  private readonly timers = new Map<number, Timer[]>();
  private readonly itemClouds = new Map<number, Cloud[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A05A");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const clouds: Cloud[] = [];
    this.itemClouds.set(itemId, clouds);

    const drop = TimerUtils.newTimer();
    drop.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      clouds.push(this.drop(owner, hero.x, hero.y));
    });

    const watch = TimerUtils.newTimer();
    watch.start(0.1, true, () => {
      for (let i = clouds.length - 1; i >= 0; i--) {
        const cloud = clouds[i];
        cloud.age += 0.1;
        if (cloud.age >= 4) {
          clouds.splice(i, 1);
          this.clear(owner, cloud);
          continue;
        }
        this.update(owner, cloud);
      }
    });
    this.timers.set(itemId, [drop, watch]);
  }

  public onDrop(
    _vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    for (const t of this.timers.get(itemId) ?? []) TimerUtils.releaseTimer(t);
    this.timers.delete(itemId);
    for (const cloud of this.itemClouds.get(itemId) ?? []) {
      this.clear(owner, cloud);
    }
    this.itemClouds.delete(itemId);
  }

  private drop(owner: MapPlayer, x: number, y: number): Cloud {
    Effect.create("Abilities/Weapons/Mortar/MortarMissile.mdl", x, y).destroy();
    const effects: Effect[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const e = Effect.create(
        "Abilities/Spells/Human/CloudOfFog/CloudOfFog.mdl",
        x + 130 * Math.cos(a),
        y + 130 * Math.sin(a),
      );
      e.scale = 0.9;
      effects.push(e);
    }
    // The creeps groping in the smoke are held to this, so that the
    // Spawner leaves them alone
    const anchor = Unit.create(owner, this.dummyUnitId, x, y);
    anchor.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 5);
    // From inside the smoke the daggers see everyone groping out of it
    const sight = FogModifier.create(
      owner,
      FOG_OF_WAR_VISIBLE,
      x,
      y,
      600,
      true,
      false,
    );
    sight.start();
    return {
      anchor,
      sight,
      at: Point.create(x, y),
      effects,
      age: 0,
      inside: new Set<Unit>(),
      stabbed: new Set<Unit>(),
    };
  }

  private update(owner: MapPlayer, cloud: Cloud): void {
    const { x, y } = cloud.at;
    const creeps = GameMap.REMAINING_PLAYER_CREEPS[owner.id + 9];

    // Who came out of the smoke gets a dagger
    // Deleting inside forEach would end the loop there
    const left: Unit[] = [];
    cloud.inside.forEach((u) => {
      const dx = u.x - x;
      const dy = u.y - y;
      if (u.isAlive() && dx * dx + dy * dy <= 300 * 300) return;
      left.push(u);
    });
    for (const u of left) {
      cloud.inside.delete(u);
      this.release(owner, cloud, u);
      if (!u.isAlive() || cloud.stabbed.has(u)) continue;
      cloud.stabbed.add(u);
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
      dummy.addAbility(this.abilityId);
      dummy.issueTargetOrder("shadowstrike", u);
    }

    // Who is in it gropes its way out, away from where the bomb fell
    const grp = Group.fromRange(300, cloud.at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (cloud.inside.has(u)) return;

      const creep = creeps?.get(u.id);
      if (creep != null) {
        // A taunt (Mountain Giant, Cursed Doll) holds on
        if (creep.tauntTarget != null && creep.tauntTarget.isAlive()) return;
        creep.tauntTarget = cloud.anchor;
      }
      cloud.inside.add(u);
      let a = (Math.atan2(u.y - y, u.x - x) * 180) / Math.PI;
      if (u.x === x && u.y === y) a = RandomNumberGenerator.random(0, 359);
      a += RandomNumberGenerator.random(-30, 30);
      a *= Math.PI / 180;
      u.issueOrderAt(
        OrderId.Move,
        x + 420 * Math.cos(a),
        y + 420 * Math.sin(a),
      );
    });
    grp.destroy();
  }

  // Sends a creep that groped its way out back after the hero
  private release(owner: MapPlayer, cloud: Cloud, u: Unit): void {
    const creep = GameMap.REMAINING_PLAYER_CREEPS[owner.id + 9]?.get(u.id);
    if (creep == null || creep.tauntTarget?.handle !== cloud.anchor.handle) {
      return;
    }
    creep.tauntTarget = null;
    if (!u.isAlive()) return;

    const vehicle = GameMap.PLAYER_VEHICLES[owner.id];
    creep.attackOrderPosition = [vehicle.lastKnownX, vehicle.lastKnownY];
    u.issueOrderAt(OrderId.Attack, vehicle.lastKnownX, vehicle.lastKnownY);
  }

  // The smoke clears: whoever is still groping in it finds its way again
  private clear(owner: MapPlayer, cloud: Cloud): void {
    cloud.inside.forEach((u) => this.release(owner, cloud, u));
    cloud.inside.clear();
    cloud.stabbed.clear();
    for (const e of cloud.effects) e.destroy();
    cloud.sight.destroy();
    cloud.at.destroy();
  }
}
