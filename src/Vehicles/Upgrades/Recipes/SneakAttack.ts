import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { GameMap } from "../../../Game/GameMap";
import { SneakAttackDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/SneakAttackDamageEvent";

const MULT = Math.PI / 180;

interface Brawl {
  treants: Unit[];
  // Every enemy turned on a Treant, and for how many seconds more
  offGuard: Map<Unit, { treant: Unit; left: number }>;
  timers: Timer[];
}

// 2 Treants every 15 seconds for 15 seconds that pick fights: every enemy a
// Treant strikes turns on that Treant for 3 seconds (creep.tauntTarget), its
// back to the hero. Every 2.5 seconds the hero throws a poisoned dagger at the
// enemy off its guard with the most life within 800: 250 + 30 every 3s for 9s
// (A05E), -50% movement. With nobody off guard it is a plain Shadow Strike
// (A047, 100) at the nearest enemy within 800
export class SneakAttack extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I0E6");
  public readonly merchantItemTypeId = FourCC("I0E7");
  public readonly recipe: number[] = [FourCC("I05N"), FourCC("I05Q")];

  private readonly brawls = new Map<number, Brawl>();
  private readonly treantUnitTypeId: number = FourCC("e003");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly sneakAbilityId: number = FourCC("A05E");
  private readonly daggerAbilityId: number = FourCC("A047");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const brawl: Brawl = { treants: [], offGuard: new Map(), timers: [] };
    this.brawls.set(itemId, brawl);

    const summon = () => {
      const hero = vehicle.unit;
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const x = hero.x + 150 * Math.cos(radians);
        const y = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/Treants/feralspirittarget.mdl",
          x,
          y,
        ).destroy();
        const treant = Unit.create(owner, this.treantUnitTypeId, x, y);
        treant.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
        brawl.treants.push(treant);
        SneakAttackDamageEvent.BRAWLERS.set(treant.id, (struck) =>
          this.provoke(owner, brawl, treant, struck),
        );
      }
    };
    const grow = TimerUtils.newTimer();
    grow.start(15, true, summon);
    summon();

    const throwDagger = TimerUtils.newTimer();
    throwDagger.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.stab(hero, owner, brawl);
    });

    // Fights run out, and the enemies turn back to the hero
    const cool = TimerUtils.newTimer();
    cool.start(0.5, true, () => {
      // Deleting inside forEach would end the loop there
      const over: Unit[] = [];
      brawl.offGuard.forEach((fight, u) => {
        fight.left -= 0.5;
        if (fight.left > 0 && fight.treant.isAlive() && u.isAlive()) return;
        over.push(u);
      });
      for (const u of over) this.release(owner, brawl, u);
      brawl.treants = brawl.treants.filter((treant) => {
        if (treant.isAlive()) return true;
        SneakAttackDamageEvent.BRAWLERS.delete(treant.id);
        return false;
      });
    });
    brawl.timers.push(grow, throwDagger, cool);
  }

  public onDrop(
    _vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const brawl = this.brawls.get(itemId);
    this.brawls.delete(itemId);
    if (brawl == null) return;
    for (const t of brawl.timers) TimerUtils.releaseTimer(t);
    brawl.timers.length = 0;
    const all: Unit[] = [];
    brawl.offGuard.forEach((_fight, u) => all.push(u));
    for (const u of all) this.release(owner, brawl, u);
    for (const treant of brawl.treants) {
      SneakAttackDamageEvent.BRAWLERS.delete(treant.id);
      if (treant.isAlive()) treant.kill();
    }
    brawl.treants.length = 0;
  }

  // The enemy a Treant strikes turns on it for 3 seconds
  private provoke(
    owner: MapPlayer,
    brawl: Brawl,
    treant: Unit,
    struck: Unit,
  ): void {
    if (!struck.isAlive() || !treant.isAlive()) return;
    const creep = GameMap.REMAINING_PLAYER_CREEPS[owner.id + 9]?.get(struck.id);
    if (creep != null) {
      // Another taunt (a Cursed Doll, a Mountain Giant) holds on
      const other = creep.tauntTarget;
      if (
        other != null &&
        other.isAlive() &&
        !brawl.treants.some((t) => t.handle === other.handle)
      ) {
        return;
      }
      creep.tauntTarget = treant;
    }
    const fight = brawl.offGuard.get(struck);
    brawl.offGuard.set(struck, { treant, left: 3 });
    if (fight != null && fight.treant.handle === treant.handle) return;
    struck.issueTargetOrder(OrderId.Attack, treant);
  }

  // Sends the enemy back after the hero
  private release(owner: MapPlayer, brawl: Brawl, u: Unit): void {
    const fight = brawl.offGuard.get(u);
    brawl.offGuard.delete(u);
    if (fight == null) return;
    const creep = GameMap.REMAINING_PLAYER_CREEPS[owner.id + 9]?.get(u.id);
    if (creep == null || creep.tauntTarget?.handle !== fight.treant.handle) {
      return;
    }
    creep.tauntTarget = null;
    if (!u.isAlive()) return;

    const vehicle = GameMap.PLAYER_VEHICLES[owner.id];
    creep.attackOrderPosition = [vehicle.lastKnownX, vehicle.lastKnownY];
    u.issueOrderAt(OrderId.Attack, vehicle.lastKnownX, vehicle.lastKnownY);
  }

  // The enemy off its guard with the most life, else the nearest enemy
  private stab(hero: Unit, owner: MapPlayer, brawl: Brawl): void {
    let sneak: Unit | undefined;
    let most = 0;
    let nearest: Unit | undefined;
    let least = 0;
    const grp = Group.fromRange(800, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      if (brawl.offGuard.has(u) && u.life > most) {
        sneak = u;
        most = u.life;
      }
      const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
      if (nearest == null || d < least) {
        nearest = u;
        least = d;
      }
    });
    grp.destroy();

    const target = sneak ?? nearest;
    if (target == null) return;
    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
    dummy.addAbility(
      sneak != null ? this.sneakAbilityId : this.daggerAbilityId,
    );
    dummy.issueTargetOrder("shadowstrike", target);
  }
}
