import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

const MULT = Math.PI / 180;

interface Squadron {
  machines: Unit[];
  // Where the stations around the hero are turned to, in degrees
  angle: number;
  station: Timer;
  throws: Timer;
}

// 3 Flying Machines (h00F, no attack of their own) keep station 450 from
// the hero, 120 degrees apart, the stations turning 20 degrees a second.
// Every 3 seconds a storm hammer from the hero flies 1200 a second to each
// machine in turn (the one nearest the target last) and on to the farthest
// enemy within 1000 of the hero: 150 + 50 and a 1 s + 0.5 s stun for every
// machine it passed. Every other enemy within 100 of its path takes 40, once
export class Relay extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I05W");
  public readonly merchantItemTypeId = FourCC("I05X");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I05D")];

  private readonly squadrons = new Map<number, Squadron>();
  private readonly machineUnitId: number = FourCC("h00F");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const squadron: Squadron = {
      machines: [],
      angle: 0,
      station: TimerUtils.newTimer(),
      throws: TimerUtils.newTimer(),
    };
    this.squadrons.set(itemId, squadron);
    for (let i = 0; i < 3; i++) {
      const radians = 120 * i * MULT;
      squadron.machines.push(
        Unit.create(
          owner,
          this.machineUnitId,
          vehicle.unit.x + 450 * Math.cos(radians),
          vehicle.unit.y + 450 * Math.sin(radians),
        ),
      );
    }

    squadron.station.start(0.5, true, () => {
      const hero = vehicle.unit;
      squadron.angle = (squadron.angle + 10) % 360;
      squadron.machines.forEach((machine, i) => {
        const radians = (squadron.angle + 120 * i) * MULT;
        machine.issueOrderAt(
          "move",
          hero.x + 450 * Math.cos(radians),
          hero.y + 450 * Math.sin(radians),
        );
      });
    });

    squadron.throws.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let target: Unit | undefined;
      let farthest = 0;
      const grp = Group.fromRange(1000, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (dx * dx + dy * dy > farthest) {
          target = u;
          farthest = dx * dx + dy * dy;
        }
      });
      grp.destroy();
      if (target == null) return;

      // Farthest from the target first, so the hammer comes round to it
      const final = target;
      const route = squadron.machines.slice().sort((a, b) => {
        const da = (a.x - final.x) ** 2 + (a.y - final.y) ** 2;
        const db = (b.x - final.x) ** 2 + (b.y - final.y) ** 2;
        return db - da;
      });
      this.fly(hero, owner, route, final);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const squadron = this.squadrons.get(itemId);
    this.squadrons.delete(itemId);
    if (squadron == null) return;
    TimerUtils.releaseTimer(squadron.station);
    TimerUtils.releaseTimer(squadron.throws);
    for (const machine of squadron.machines) machine.kill();
  }

  private fly(hero: Unit, owner: MapPlayer, route: Unit[], target: Unit) {
    const hammer = Effect.create(
      "Abilities/Spells/Human/StormBolt/StormBoltMissile.mdl",
      hero.x,
      hero.y,
    );
    hammer.z = 80;
    const clipped = new Set<Unit>([target]);
    let x = hero.x;
    let y = hero.y;
    let hops = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      // The machine it flies to next, then the target
      const next = hops < route.length ? route[hops] : target;
      const dx = next.x - x;
      const dy = next.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 60) {
        x += (60 * dx) / d;
        y += (60 * dy) / d;
        hammer.x = x;
        hammer.y = y;
        hammer.setYaw(Atan2(dy, dx));
        this.clip(hero, owner, x, y, clipped);
        // A target that died on the way lets the hammer drop
        if (hops < route.length || target.isAlive()) return;
      } else if (hops < route.length) {
        hops++;
        Effect.create(
          "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
          next.x,
          next.y,
        ).destroy();
        return;
      }

      TimerUtils.releaseTimer(t);
      hammer.destroy();
      if (!target.isAlive()) return;
      Effect.create(
        "Abilities/Spells/Human/StormBolt/StormBoltTarget.mdl",
        target.x,
        target.y,
      ).destroy();
      hero.damageTarget(
        target.handle,
        150 + 50 * hops,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (target.isAlive()) StunUtils.stunUnit(target.handle, 1 + 0.5 * hops);
    });
  }

  private clip(
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
    clipped: Set<Unit>,
  ) {
    const at = Point.create(x, y);
    const grp = Group.fromRange(100, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (clipped.has(u)) return;

      clipped.add(u);
      hero.damageTarget(
        u.handle,
        40,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
    at.destroy();
  }
}
