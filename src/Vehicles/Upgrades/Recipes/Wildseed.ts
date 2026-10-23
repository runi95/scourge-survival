import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

interface Pod {
  effect: Effect;
  at: Point;
  age: number;
  armedAge: number;
}

// Leaves a seed pod under the hero every 3 seconds, up to 6 pods. A pod an
// enemy ground unit steps on bursts, hurting every enemy ground unit around
// it, and flings 2 new pods into the ground nearby, so the field spreads into
// the crowd that walks into it. A pod nobody steps on for 12 seconds takes
// root and wakes as a Treant, up to 3 Treants at a time
export class Wildseed extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0DS");
  public readonly merchantItemTypeId = FourCC("I0DT");
  public readonly recipe: number[] = [FourCC("I05N"), FourCC("I003")];

  private readonly placeTimers = new Map<number, Timer>();
  private readonly growTimers = new Map<number, Timer>();
  private readonly itemPods = new Map<number, Pod[]>();
  private readonly itemTreants = new Map<number, Unit[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly treantUnitTypeId: number = FourCC("e003");
  private readonly maxPods = 6;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pods: Pod[] = [];
    this.itemPods.set(itemId, pods);
    const treants: Unit[] = [];
    this.itemTreants.set(itemId, treants);

    const place: Timer = TimerUtils.newTimer();
    this.placeTimers.set(itemId, place);
    place.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (pods.length >= this.maxPods) return;

      // A pod under the hero arms after 2 seconds
      pods.push(this.plant(vehicle.unit.x, vehicle.unit.y, 2));
    });

    const grow: Timer = TimerUtils.newTimer();
    this.growTimers.set(itemId, grow);
    grow.start(0.25, true, () => {
      for (let i = treants.length - 1; i >= 0; i--) {
        if (!treants[i].isAlive()) treants.splice(i, 1);
      }

      const burst: Pod[] = [];
      for (let i = pods.length - 1; i >= 0; i--) {
        const pod = pods[i];
        pod.age += 0.25;
        if (pod.age >= pod.armedAge && this.touched(owner, pod.at)) {
          pods.splice(i, 1);
          burst.push(pod);
        } else if (pod.age >= 12 && treants.length < 3) {
          pods.splice(i, 1);
          treants.push(this.sprout(owner, pod));
        }
      }

      for (const pod of burst) {
        this.burst(owner, pod);
        // It flings 2 new pods 150 - 250 away, armed 2 seconds after landing
        for (let i = 0; i < 2 && pods.length < this.maxPods; i++) {
          const angle = RandomNumberGenerator.random(0, 359) * bj_DEGTORAD;
          const distance = RandomNumberGenerator.random(150, 250);
          pods.push(
            this.plant(
              pod.at.x + distance * Math.cos(angle),
              pod.at.y + distance * Math.sin(angle),
              2,
            ),
          );
        }
        pod.at.destroy();
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
    TimerUtils.releaseTimer(this.placeTimers.get(itemId));
    this.placeTimers.delete(itemId);
    TimerUtils.releaseTimer(this.growTimers.get(itemId));
    this.growTimers.delete(itemId);

    for (const pod of this.itemPods.get(itemId) ?? []) {
      pod.effect.destroy();
      pod.at.destroy();
    }
    this.itemPods.delete(itemId);
    for (const treant of this.itemTreants.get(itemId) ?? []) {
      if (treant.isAlive()) treant.kill();
    }
    this.itemTreants.delete(itemId);
  }

  private plant(x: number, y: number, armedAge: number): Pod {
    Effect.create(
      "Objects/Spawnmodels/NightElf/NEDeathSmall/NEDeathSmall.mdl",
      x,
      y,
    ).destroy();
    const effect = Effect.create(
      "Doodads/Ashenvale/Plants/AshenShrooms/AshenShrooms0.mdl",
      x,
      y,
    );
    effect.scale = 0.7;
    return { effect, at: Point.create(x, y), age: 0, armedAge };
  }

  private touched(owner: MapPlayer, at: Point): boolean {
    let touched = false;
    const grp = Group.fromRange(175, at);
    grp.for((u) => {
      if (!touched && this.isVictim(u, owner)) touched = true;
    });
    grp.destroy();
    return touched;
  }

  // The pod bursts for 80 on every enemy ground unit within 200
  private burst(owner: MapPlayer, pod: Pod): void {
    pod.effect.destroy();
    Effect.create(
      "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
      pod.at.x,
      pod.at.y,
    ).destroy();
    Effect.create(
      "Objects/Spawnmodels/NightElf/NEDeathMedium/NEDeath.mdl",
      pod.at.x,
      pod.at.y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitId, pod.at.x, pod.at.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    const grp = Group.fromRange(200, pod.at);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        80,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }

  // An untouched pod wakes as a Treant for 15 seconds
  private sprout(owner: MapPlayer, pod: Pod): Unit {
    pod.effect.destroy();
    Effect.create(
      "Abilities/Spells/Orc/Treants/feralspirittarget.mdl",
      pod.at.x,
      pod.at.y,
    ).destroy();
    const treant = Unit.create(
      owner,
      this.treantUnitTypeId,
      pod.at.x,
      pod.at.y,
    );
    treant.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
    pod.at.destroy();
    return treant;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }
}
