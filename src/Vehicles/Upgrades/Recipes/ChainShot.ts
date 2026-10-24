import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

// Every 3 seconds two boulders 250 apart on a chain, spinning, from the hero
// at 700 a second to 100 past a random enemy ground unit within 800. Every
// enemy unit within 60 of the chain takes 65 and is ensnared (A042: held 3 s,
// flyers pulled down), once per shot; at the end each boulder does 70 to
// every enemy ground unit within 150 of it
export class ChainShot extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I08O");
  public readonly merchantItemTypeId = FourCC("I08P");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I05G")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A042");

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
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies = this.enemies(hero.x, hero.y, 800, owner, false);
      if (enemies.length === 0) return;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      this.fire(hero, owner, target.x, target.y);
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

  private fire(hero: Unit, owner: MapPlayer, tx: number, ty: number) {
    const sx = hero.x;
    const sy = hero.y;
    const radians = Atan2(ty - sy, tx - sx);
    const ca = Math.cos(radians);
    const sa = Math.sin(radians);
    const length =
      Math.sqrt((tx - sx) * (tx - sx) + (ty - sy) * (ty - sy)) + 100;

    const model = "Abilities/Weapons/DemolisherMissile/DemolisherMissile.mdl";
    const a = Effect.create(model, sx, sy);
    const b = Effect.create(model, sx, sy);
    a.setHeight(60);
    b.setHeight(60);
    const chain = AddLightningEx("LEAS", false, sx, sy, 60, sx, sy, 60);
    const tangled: Unit[] = [];
    let flown = 0;
    let spin = 0;

    const fly = TimerUtils.newTimer();
    fly.start(0.05, true, () => {
      flown = Math.min(length, flown + 35);
      spin += 0.6;
      const cx = sx + flown * ca;
      const cy = sy + flown * sa;
      const ax = cx + 125 * Math.cos(spin);
      const ay = cy + 125 * Math.sin(spin);
      const bx = cx - 125 * Math.cos(spin);
      const by = cy - 125 * Math.sin(spin);
      a.x = ax;
      a.y = ay;
      b.x = bx;
      b.y = by;
      MoveLightningEx(chain, false, ax, ay, 60, bx, by, 60);

      // Every enemy within 60 of the chain between the two boulders
      for (const u of this.enemies(cx, cy, 185, owner, true)) {
        if (tangled.indexOf(u) >= 0) continue;
        const along = (u.x - cx) * Math.cos(spin) + (u.y - cy) * Math.sin(spin);
        const across =
          -(u.x - cx) * Math.sin(spin) + (u.y - cy) * Math.cos(spin);
        if (along < -125 || along > 125 || across < -60 || across > 60) {
          continue;
        }
        tangled.push(u);
        this.tangle(hero, owner, u);
      }

      if (flown < length) return;
      TimerUtils.releaseTimer(fly);
      DestroyLightning(chain);
      a.destroy();
      b.destroy();
      this.crash(hero, owner, ax, ay);
      this.crash(hero, owner, bx, by);
    });
  }

  private tangle(hero: Unit, owner: MapPlayer, u: Unit) {
    hero.damageTarget(
      u.handle,
      65,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    if (!u.isAlive()) return;
    const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    dummy.addAbility(this.netAbilityId);
    dummy.issueTargetOrder("ensnare", u);
  }

  private crash(hero: Unit, owner: MapPlayer, x: number, y: number) {
    Effect.create(
      "Abilities/Weapons/DemolisherMissile/DemolisherMissile.mdl",
      x,
      y,
    ).destroy();
    for (const u of this.enemies(x, y, 150, owner, false)) {
      hero.damageTarget(
        u.handle,
        70,
        false,
        false,
        ATTACK_TYPE_SIEGE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
    }
  }

  // The visible enemy units within range of (x, y), flyers too or not
  private enemies(
    x: number,
    y: number,
    range: number,
    owner: MapPlayer,
    flyers: boolean,
  ) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (!flyers && u.isUnitType(UNIT_TYPE_FLYING)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }
}
