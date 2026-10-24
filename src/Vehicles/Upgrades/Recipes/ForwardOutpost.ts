import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { ForwardOutpostDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/ForwardOutpostDamageEvent";

const MULT = Math.PI / 180;

interface Outpost {
  unit: Unit;
  // Seconds until it can shell again, and since it last did
  reload: number;
  idle: number;
}

interface Post {
  hero: Unit;
  outposts: Outpost[];
  answer: (this: void, attacker: Unit) => void;
  timers: Timer[];
}

// Every 30 seconds an outpost (n01R: 800 life, 3 armor, 30 s) 350 away from
// the hero towards the nearest enemy. Every enemy ground unit within 800 of
// an outpost that hurts it or the hero has a boulder (u01P: 58 - 60, 150
// splash) lobbed at it from the outpost, at most one a second per outpost;
// an outpost nobody gives a reason shells the enemy ground unit nearest to it
// within 800 every 3 seconds
export class ForwardOutpost extends WeaponUpgradeRecipe {
  public readonly cooldown = 30;
  public readonly itemTypeId = FourCC("I07K");
  public readonly merchantItemTypeId = FourCC("I07L");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05F")];

  private readonly posts = new Map<number, Post>();
  private readonly outpostUnitId: number = FourCC("n01R");
  private readonly boulderUnitId: number = FourCC("u01P");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const post: Post = {
      hero: vehicle.unit,
      outposts: [],
      answer: (attacker) => {
        if (!attacker.isAlive()) return;
        if (attacker.isUnitType(UNIT_TYPE_FLYING)) return;
        for (const outpost of post.outposts) {
          if (outpost.reload > 0) continue;
          const dx = attacker.x - outpost.unit.x;
          const dy = attacker.y - outpost.unit.y;
          if (dx * dx + dy * dy > 640000) continue;
          this.shell(outpost, owner, attacker);
          return;
        }
      },
      timers: [],
    };
    this.posts.set(itemId, post);
    ForwardOutpostDamageEvent.cover(post.hero.id, post.answer);

    const build = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const nearest = this.nearest(hero.x, hero.y, 900, owner);
      const radians =
        nearest != null
          ? Atan2(nearest.y - hero.y, nearest.x - hero.x)
          : RandomNumberGenerator.random(0, 359) * MULT;
      const x = hero.x + 350 * Math.cos(radians);
      const y = hero.y + 350 * Math.sin(radians);
      Effect.create(
        "Objects/Spawnmodels/Other/ToonBoom/ToonBoom.mdl",
        x,
        y,
      ).destroy();
      const unit = Unit.create(owner, this.outpostUnitId, x, y, 270);
      unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
      post.outposts.push({ unit, reload: 0, idle: 0 });
      ForwardOutpostDamageEvent.cover(unit.id, post.answer);
    };

    const outposts = TimerUtils.newTimer();
    outposts.start(0.25, true, () => {
      for (let i = post.outposts.length - 1; i >= 0; i--) {
        const outpost = post.outposts[i];
        if (!outpost.unit.isAlive()) {
          ForwardOutpostDamageEvent.uncover(outpost.unit.id, post.answer);
          post.outposts.splice(i, 1);
          continue;
        }
        outpost.reload -= 0.25;
        outpost.idle += 0.25;
        if (outpost.idle < 3) continue;
        const { x, y } = outpost.unit;
        const target = this.nearest(x, y, 800, owner);
        if (target != null) this.shell(outpost, owner, target);
      }
    });

    const t = TimerUtils.newTimer();
    t.start(this.cooldown, true, build);
    post.timers.push(outposts, t);
    build();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const post = this.posts.get(itemId);
    this.posts.delete(itemId);
    if (post == null) return;
    for (const t of post.timers) TimerUtils.releaseTimer(t);
    post.timers.length = 0;
    ForwardOutpostDamageEvent.uncover(post.hero.id, post.answer);
    for (const outpost of post.outposts) {
      ForwardOutpostDamageEvent.uncover(outpost.unit.id, post.answer);
      if (outpost.unit.isAlive()) outpost.unit.kill();
    }
    post.outposts.length = 0;
  }

  private shell(outpost: Outpost, owner: MapPlayer, target: Unit) {
    outpost.reload = 1;
    outpost.idle = 0;
    const { x, y } = outpost.unit;
    const boulder = Unit.create(owner, this.boulderUnitId, x, y);
    boulder.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
    boulder.issueTargetOrder("attack", target);
  }

  // The visible enemy ground unit nearest to (x, y) within range
  private nearest(
    x: number,
    y: number,
    range: number,
    owner: MapPlayer,
  ): Unit | undefined {
    let best: Unit | undefined;
    let bestDist = 0;
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (best == null || d < bestDist) {
        best = u;
        bestDist = d;
      }
    });
    grp.destroy();
    at.destroy();
    return best;
  }
}
